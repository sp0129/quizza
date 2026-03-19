import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, gradients } from '../theme/colors';
import { getCategoryTheme } from '../utils/categoryThemes';
import { api } from '../api/client';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface OpenChallenge {
  id: string;
  category: string;
  mode: string;
  posted_by_username: string;
  posted_at: string;
  player_count: number;
  high_score: number;
  high_score_username: string;
  user_score: number | null;
  user_correct_count: number | null;
}

interface MyChallenge extends OpenChallenge {
  expires_at: string;
  user_rank: number | null;
}

interface ChallengesResponse {
  challenges: OpenChallenge[];
  total_count: number;
  has_more: boolean;
}

type SortOption = 'most_played' | 'newest';
type TabOption = 'browse' | 'friends' | 'mine';

const PAGE_SIZE = 20;

export default function OpenChallengesScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    api.get<{ gamesPlayedTotal?: number; friendsCount?: number }>('/users/me/stats')
      .then(s => {
        const gpt = s.gamesPlayedTotal ?? 0;
        const fc = s.friendsCount ?? 0;
        setIsNewUser((fc === 0 && gpt < 5) || (fc > 0 && gpt === 0));
      }).catch(() => {});
  }, []);

  const [challenges, setChallenges] = useState<OpenChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<SortOption>('most_played');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const offsetRef = useRef(0);

  // Tab toggle: browse vs friends vs mine
  const [tab, setTab] = useState<TabOption>('browse');
  const [myChallenges, setMyChallenges] = useState<MyChallenge[]>([]);
  const [friendChallenges, setFriendChallenges] = useState<OpenChallenge[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [myRefreshing, setMyRefreshing] = useState(false);
  const [friendsRefreshing, setFriendsRefreshing] = useState(false);

  const fetchChallenges = useCallback(async (reset: boolean) => {
    try {
      const offset = reset ? 0 : offsetRef.current;
      let url = `/open-challenges?sort=${sort}&limit=${PAGE_SIZE}&offset=${offset}`;
      if (categoryFilter) url += `&category=${encodeURIComponent(categoryFilter)}`;

      const data = await api.get<ChallengesResponse>(url);

      if (reset) {
        setChallenges(data.challenges);
        // Extract unique categories for filter chips
        const cats = [...new Set(data.challenges.map(c => c.category))];
        setCategories(prev => {
          const merged = [...new Set([...prev, ...cats])];
          return merged.sort();
        });
      } else {
        setChallenges(prev => [...prev, ...data.challenges]);
      }
      setHasMore(data.has_more);
      offsetRef.current = reset ? data.challenges.length : offset + data.challenges.length;
    } catch (err) {
      console.error(err);
    }
  }, [sort, categoryFilter]);

  const fetchMyChallenges = useCallback(async () => {
    try {
      const data = await api.get<{ challenges: MyChallenge[] }>('/open-challenges/mine');
      setMyChallenges(data.challenges);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchFriendChallenges = useCallback(async () => {
    try {
      const data = await api.get<{ challenges: OpenChallenge[] }>('/open-challenges/friends');
      setFriendChallenges(data.challenges);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Initial load + reload on sort/filter/tab change
  useEffect(() => {
    if (tab === 'browse') {
      setLoading(true);
      fetchChallenges(true).finally(() => setLoading(false));
    } else if (tab === 'friends') {
      setFriendsLoading(true);
      fetchFriendChallenges().finally(() => setFriendsLoading(false));
    } else {
      setMyLoading(true);
      fetchMyChallenges().finally(() => setMyLoading(false));
    }
  }, [sort, categoryFilter, tab]);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      if (tab === 'browse') fetchChallenges(true);
      else if (tab === 'friends') fetchFriendChallenges();
      else fetchMyChallenges();
    }, [fetchChallenges, fetchFriendChallenges, fetchMyChallenges, tab])
  );

  const handleRefresh = async () => {
    if (tab === 'browse') {
      setRefreshing(true);
      await fetchChallenges(true);
      setRefreshing(false);
    } else if (tab === 'friends') {
      setFriendsRefreshing(true);
      await fetchFriendChallenges();
      setFriendsRefreshing(false);
    } else {
      setMyRefreshing(true);
      await fetchMyChallenges();
      setMyRefreshing(false);
    }
  };

  const handleTabChange = (t: TabOption) => {
    if (t === tab) return;
    Haptics.selectionAsync();
    setTab(t);
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchChallenges(false);
    setLoadingMore(false);
  };

  const handleSortChange = (newSort: SortOption) => {
    if (newSort === sort) return;
    Haptics.selectionAsync();
    setSort(newSort);
  };

  const handleCategoryPress = (cat: string) => {
    Haptics.selectionAsync();
    setCategoryFilter(prev => prev === cat ? null : cat);
  };

  const renderChallenge = ({ item }: { item: OpenChallenge }) => {
    const theme = getCategoryTheme(item.category);
    const played = item.user_score != null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('ChallengeDetail', { challengeId: item.id });
        }}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.cardEmoji}>{theme.emoji}</Text>
        </View>
        <View style={styles.cardCenter}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardCategory} numberOfLines={1}>{item.category}</Text>
            <View style={styles.playerCountBadge}>
              <Text style={styles.playerCountText}>{item.player_count} 👥</Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>by @{item.posted_by_username}</Text>
          <Text style={styles.cardMeta}>
            {played ? `High Score: ${item.high_score}  ·  Yours: ${item.user_score}` : 'Play to see scores'}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.modeBadge, item.mode === '5Q' ? styles.modeBadge5 : styles.modeBadge10]}>
            <Text style={styles.modeBadgeText}>{item.mode}</Text>
          </View>
          {played && <Text style={styles.playedLabel}>Played</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Sort toggles */}
      <View style={styles.sortRow}>
        {(['most_played', 'newest'] as SortOption[]).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.sortPill, sort === s && styles.sortPillActive]}
            onPress={() => handleSortChange(s)}
            activeOpacity={0.7}
          >
            <Text style={[styles.sortPillText, sort === s && styles.sortPillTextActive]}>
              {s === 'most_played' ? 'Most Played' : 'Newest'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={c => c}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item: cat }) => {
            const theme = getCategoryTheme(cat);
            const active = categoryFilter === cat;
            return (
              <TouchableOpacity
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => handleCategoryPress(cat)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>{theme.emoji} {cat}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🎯</Text>
        <Text style={styles.emptyTitle}>No challenges yet</Text>
        <Text style={styles.emptySubtitle}>
          Play a solo game and post your score as a challenge!
        </Text>
      </View>
    );
  };

  const renderMyChallenge = ({ item }: { item: MyChallenge }) => {
    const theme = getCategoryTheme(item.category);
    const expired = new Date(item.expires_at) < new Date();
    const daysLeft = Math.max(0, Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / 86400000));

    return (
      <TouchableOpacity
        style={[styles.card, expired && styles.cardExpired]}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('ChallengeDetail', { challengeId: item.id });
        }}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.cardEmoji}>{theme.emoji}</Text>
        </View>
        <View style={styles.cardCenter}>
          <Text style={styles.cardCategory} numberOfLines={1}>{item.category}</Text>
          <Text style={styles.cardMeta}>
            {item.player_count} {item.player_count === 1 ? 'player' : 'players'} · High Score: {item.high_score}
          </Text>
          <Text style={styles.cardMeta}>
            Your Score: {item.user_score ?? '-'}
            {item.user_rank != null ? `  ·  Rank #${item.user_rank}` : ''}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.modeBadge, item.mode === '5Q' ? styles.modeBadge5 : styles.modeBadge10]}>
            <Text style={styles.modeBadgeText}>{item.mode}</Text>
          </View>
          <Text style={[styles.expiryLabel, expired && styles.expiryExpired]}>
            {expired ? 'Expired' : `${daysLeft}d left`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMyEmpty = () => {
    if (myLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📝</Text>
        <Text style={styles.emptyTitle}>No challenges posted</Text>
        <Text style={styles.emptySubtitle}>
          After a solo game, tap "Post as Challenge" to share it here!
        </Text>
      </View>
    );
  };

  const renderFriendsEmpty = () => {
    if (friendsLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>👥</Text>
        <Text style={styles.emptyTitle}>No friend challenges yet</Text>
        <Text style={styles.emptySubtitle}>
          When your friends post challenges, they'll show up here!
        </Text>
      </View>
    );
  };

  return (
    <LinearGradient colors={gradients.game} style={styles.flex}>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>{isNewUser ? 'Discover Challenges' : 'Open Challenges'}</Text>
        {isNewUser && <Text style={styles.subtitle}>Test yourself against the community</Text>}

        {/* Browse / Friends / Mine toggle */}
        <View style={styles.tabRow}>
          {(['browse', 'friends', 'mine'] as TabOption[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => handleTabChange(t)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                {t === 'browse' ? 'Browse' : t === 'friends' ? 'Friends' : 'Mine'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'browse' ? (
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.brand.primary} size="large" />
            </View>
          ) : (
            <FlatList
              data={challenges}
              renderItem={renderChallenge}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={renderEmpty}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.text.secondary}
                />
              }
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator color={colors.text.secondary} style={styles.footer} />
                ) : null
              }
            />
          )
        ) : tab === 'friends' ? (
          friendsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.brand.primary} size="large" />
            </View>
          ) : (
            <FlatList
              data={friendChallenges}
              renderItem={renderChallenge}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={renderFriendsEmpty}
              refreshControl={
                <RefreshControl
                  refreshing={friendsRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.text.secondary}
                />
              }
            />
          )
        ) : (
          myLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.brand.primary} size="large" />
            </View>
          ) : (
            <FlatList
              data={myChallenges}
              renderItem={renderMyChallenge}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={renderMyEmpty}
              refreshControl={
                <RefreshControl
                  refreshing={myRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.text.secondary}
                />
              }
            />
          )
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { paddingBottom: 24 },

  // Tab toggle
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.brand.primary,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },

  // Header section
  headerSection: { marginBottom: 12 },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sortPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  sortPillActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  sortPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  sortPillTextActive: {
    color: '#FFFFFF',
  },
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border + '30',
  },
  chipActive: {
    backgroundColor: colors.brand.secondary + '30',
    borderColor: colors.brand.secondary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },

  // Challenge card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  cardLeft: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.bg.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardEmoji: { fontSize: 20 },
  cardCenter: { flex: 1, gap: 2 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerCountBadge: {
    backgroundColor: colors.brand.primary + '25',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  playerCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  cardCategory: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 4,
    marginLeft: 8,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  modeBadge5: { backgroundColor: colors.cyan + '30' },
  modeBadge10: { backgroundColor: colors.brand.primary + '30' },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.primary,
  },
  playedLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.correct,
  },
  cardExpired: {
    opacity: 0.5,
  },
  expiryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  expiryExpired: {
    color: colors.wrong,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 260,
  },

  footer: { paddingVertical: 16 },
});
