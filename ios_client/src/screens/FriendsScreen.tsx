import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Share,
  Image,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { colors } from '../theme/colors';
import { getAvatar } from '../utils/avatars';
import FriendProfileOverlay from '../components/FriendProfileOverlay';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Friends'>;

interface Friend {
  id: string;
  username: string;
  avatar_id?: number;
}

interface UserSearchResult {
  id: string;
  username: string;
  avatar_id?: number;
  friend_status: 'accepted' | 'pending' | null;
}

export default function FriendsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const inputRef = useRef<TextInput>(null);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [pendingFriends, setPendingFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Friend[]>([]);
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set());

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch friends list + pending outgoing
  const fetchFriends = useCallback(async () => {
    try {
      const [accepted, pending, incoming] = await Promise.all([
        api.get<Friend[]>('/friends'),
        api.get<Friend[]>('/friends/pending'),
        api.get<Friend[]>('/friends/requests'),
      ]);
      setFriends(accepted);
      setPendingFriends(pending);
      setIncomingRequests(incoming);
    } catch {
      // Keep existing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await api.get<UserSearchResult[]>(
          `/users/search?q=${encodeURIComponent(query.trim())}`,
        );
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const addFriend = useCallback(async (friendUser: UserSearchResult) => {
    setAddingIds((prev) => new Set(prev).add(friendUser.id));
    try {
      await api.post('/friends', { username: friendUser.username });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Refresh friends + pending lists
      fetchFriends();
      // Update search result to show as pending
      setSearchResults((prev) =>
        prev.map((u) => (u.id === friendUser.id ? { ...u, friend_status: 'pending' as const } : u)),
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not add friend');
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(friendUser.id);
        return next;
      });
    }
  }, []);

  const removeFriend = useCallback(
    (friend: Friend) => {
      Alert.alert('Remove friend', `Remove ${friend.username}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete<void>(`/friends/${friend.id}`);
              setFriends((prev) => prev.filter((f) => f.id !== friend.id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]);
    },
    [],
  );

  const acceptRequest = useCallback(async (friend: Friend) => {
    setRespondingIds(prev => new Set(prev).add(friend.id));
    try {
      await api.post(`/friends/requests/${friend.id}/accept`, {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIncomingRequests(prev => prev.filter(f => f.id !== friend.id));
      fetchFriends();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not accept request');
    } finally {
      setRespondingIds(prev => { const next = new Set(prev); next.delete(friend.id); return next; });
    }
  }, [fetchFriends]);

  const declineRequest = useCallback(async (friend: Friend) => {
    setRespondingIds(prev => new Set(prev).add(friend.id));
    try {
      await api.post(`/friends/requests/${friend.id}/reject`, {});
      setIncomingRequests(prev => prev.filter(f => f.id !== friend.id));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not decline request');
    } finally {
      setRespondingIds(prev => { const next = new Set(prev); next.delete(friend.id); return next; });
    }
  }, []);

  const shareInviteLink = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const inviteLink = `https://quizza.app/invite/${user?.username ?? 'friend'}`;
    try {
      const result = await Share.share({
        message: `Join me on Quizza! Let's play trivia together. ${inviteLink}`,
        url: inviteLink,
      });
      if (result.action === Share.dismissedAction) return;
      // Also copy to clipboard
      await Clipboard.setStringAsync(inviteLink);
    } catch {
      // Fallback: just copy to clipboard
      await Clipboard.setStringAsync(inviteLink);
      Alert.alert('Copied!', 'Invite link copied to clipboard.');
    }
  }, [user?.username]);

  const isSearching = query.trim().length >= 2;

  if (isGuest) {
    return (
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={{ width: 36 }} />
          <Text style={styles.title}>Friends</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.emptyContent}>
            <Text style={styles.emptyIcon}>🔒</Text>
            <Text style={styles.emptyTitle}>Account Required</Text>
            <Text style={styles.emptyDesc}>
              Create a free account to add friends, send challenges, and build your trivia squad.
            </Text>
            <TouchableOpacity
              style={styles.searchPromptBtn}
              onPress={() => navigation.navigate('Signup' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.searchPromptText}>Create Account</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ width: 36 }} />
        <Text style={styles.title}>Friends</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={shareInviteLink}>
          <Text style={styles.shareBtnText}>📤</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Add friend by @username..."
            placeholderTextColor={colors.text.secondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search loading */}
      {searchLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.brand.primary} size="small" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {/* Search results */}
      {isSearching ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => (
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                {getAvatar(item.avatar_id) ? (
                  <Image source={getAvatar(item.avatar_id)!.image} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.avatarText}>{item.username[0]?.toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {item.username}
                </Text>
                <Text style={styles.userHandle}>@{item.username.toLowerCase()}</Text>
              </View>
              {item.friend_status === 'accepted' ? (
                <View style={styles.friendBadge}>
                  <Text style={styles.friendBadgeText}>Friends ✓</Text>
                </View>
              ) : item.friend_status === 'pending' ? (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => addFriend(item)}
                  disabled={addingIds.has(item.id)}
                >
                  {addingIds.has(item.id) ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.addBtnText}>+ Add</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            !searchLoading ? (
              <View style={styles.emptySearch}>
                <Text style={styles.emptySearchIcon}>🔍</Text>
                <Text style={styles.emptySearchText}>No users found for "{query}"</Text>
              </View>
            ) : null
          }
        />
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.brand.primary} size="large" />
        </View>
      ) : friends.length === 0 && incomingRequests.length === 0 && pendingFriends.length === 0 ? (
        /* Empty state for cold start */
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.emptyContainer}>
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.emptyContent}>
            <Text style={styles.emptyIcon}>👋</Text>
            <Text style={styles.emptyTitle}>Your first friend is waiting...</Text>
            <Text style={styles.emptyDesc}>Add a friend to:</Text>
            <View style={styles.benefitsList}>
              <Text style={styles.benefitItem}>✅ Duel each other</Text>
              <Text style={styles.benefitItem}>✅ Play group games together</Text>
              <Text style={styles.benefitItem}>✅ See head-to-head results</Text>
              <Text style={styles.benefitItem}>✅ Build rivalries</Text>
            </View>

            <TouchableOpacity
              style={styles.searchPromptBtn}
              onPress={() => inputRef.current?.focus()}
              activeOpacity={0.8}
            >
              <Text style={styles.searchPromptIcon}>🔍</Text>
              <Text style={styles.searchPromptText}>Search by Username</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
        </TouchableWithoutFeedback>
      ) : (
        /* Friends list */
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.friendRow}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedFriend(item);
              }}
            >
              <View style={styles.avatar}>
                {getAvatar(item.avatar_id) ? (
                  <Image source={getAvatar(item.avatar_id)!.image} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.avatarText}>{item.username[0]?.toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {item.username}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.challengeBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('Category', { mode: 'challenge', target: item.username, targetAvatarId: item.avatar_id });
                }}
              >
                <Text style={styles.challengeBtnText}>⚔️ Challenge</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeFriend(item)}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListHeaderComponent={
            <>
              {incomingRequests.length > 0 && (
                <View style={styles.pendingSection}>
                  <Text style={styles.listHeader}>FRIEND REQUESTS ({incomingRequests.length})</Text>
                  {incomingRequests.map((r) => (
                    <View key={r.id} style={[styles.friendRow, { borderLeftWidth: 3, borderLeftColor: colors.brand.primary }]}>
                      <View style={styles.avatar}>
                        {getAvatar(r.avatar_id) ? (
                          <Image source={getAvatar(r.avatar_id)!.image} style={styles.avatarImage} resizeMode="cover" />
                        ) : (
                          <Text style={styles.avatarText}>{r.username[0]?.toUpperCase()}</Text>
                        )}
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName} numberOfLines={1}>{r.username}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => acceptRequest(r)}
                        disabled={respondingIds.has(r.id)}
                      >
                        {respondingIds.has(r.id) ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.addBtnText}>Accept</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => declineRequest(r)}
                        disabled={respondingIds.has(r.id)}
                      >
                        <Text style={styles.removeBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              {friends.length > 0 && (
                <Text style={styles.listHeader}>YOUR FRIENDS ({friends.length})</Text>
              )}
            </>
          }
          ListFooterComponent={pendingFriends.length > 0 ? (
            <View style={styles.pendingSection}>
              <Text style={styles.listHeader}>PENDING ({pendingFriends.length})</Text>
              {pendingFriends.map((p) => (
                <View key={p.id} style={[styles.friendRow, { opacity: 0.5 }]}>
                  <View style={styles.avatar}>
                    {getAvatar(p.avatar_id) ? (
                      <Image source={getAvatar(p.avatar_id)!.image} style={styles.avatarImage} resizeMode="cover" />
                    ) : (
                      <Text style={styles.avatarText}>{p.username[0]?.toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{p.username}</Text>
                  </View>
                  <View style={styles.pendingTag}>
                    <Text style={styles.pendingTagText}>Pending</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        />
      )}

      <FriendProfileOverlay
        visible={selectedFriend !== null}
        friend={selectedFriend}
        onClose={() => setSelectedFriend(null)}
        onChallenge={(username, avatarId) => {
          setSelectedFriend(null);
          navigation.navigate('Category', { mode: 'challenge', target: username, targetAvatarId: avatarId });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    color: colors.text.primary,
    fontSize: 20,
  },
  title: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtnText: {
    fontSize: 16,
  },
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border + '40',
    gap: 10,
  },
  searchIcon: {
    fontSize: 20,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bg.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyContent: {
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  emptyDesc: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
  },
  benefitsList: {
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  benefitItem: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  searchPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
    minWidth: 220,
    justifyContent: 'center',
  },
  searchPromptIcon: {
    fontSize: 16,
  },
  searchPromptText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border + '40',
    minWidth: 220,
    justifyContent: 'center',
  },
  inviteBtnIcon: {
    fontSize: 16,
  },
  inviteBtnText: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  // User row (search results)
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '20',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.primary + '25',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.brand.primary + '40',
  },
  avatarText: {
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: '800',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  userInfo: {
    flex: 1,
    gap: 1,
  },
  userName: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  userHandle: {
    color: colors.text.secondary,
    fontSize: 13,
  },
  friendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  friendBadgeText: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '600',
  },
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pendingBadgeText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  pendingSection: {
    marginTop: 16,
    gap: 0,
  },
  pendingTag: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pendingTagText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  addBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptySearchIcon: {
    fontSize: 40,
  },
  emptySearchText: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  // Friend list
  listHeader: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 4,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  challengeBtn: {
    backgroundColor: '#F97316' + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F97316' + '40',
  },
  challengeBtnText: {
    color: '#F97316',
    fontSize: 12,
    fontWeight: '700',
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#EF4444',
    fontSize: 12,
  },
});
