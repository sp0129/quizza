import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { api } from '../api/client';
import { colors } from '../theme/colors';
import { getCategoryTheme, cleanCategoryName } from '../utils/categoryThemes';
import { getAvatar } from '../utils/avatars';

interface Friend {
  id: string;
  username: string;
  avatar_id?: number;
}

interface GameHistoryItem {
  id: string;
  category: string;
  myScore: number;
  opponentScore: number;
  won: boolean;
  tied: boolean;
  completedAt: string;
}

interface FriendHistoryResponse {
  friendsSince: string;
  stats: {
    totalGames: number;
    wins: number;
    losses: number;
    ties: number;
    winRate: number;
  };
  games: GameHistoryItem[];
}

interface FriendProfileOverlayProps {
  visible: boolean;
  friend: Friend | null;
  onClose: () => void;
  onChallenge: (username: string) => void;
}

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFriendsSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statBox, { backgroundColor: color + '18', borderTopColor: color, shadowColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function GamePill({ item }: { item: GameHistoryItem }) {
  const theme = getCategoryTheme(item.category);
  const resultColor = item.won ? colors.correct : item.tied ? colors.gold : colors.wrong;
  const resultLabel = item.won ? 'W' : item.tied ? 'T' : 'L';

  return (
    <View style={[styles.gamePill, { borderLeftColor: resultColor, backgroundColor: resultColor + '18', shadowColor: resultColor }]}>
      <Text style={styles.gamePillEmoji}>{theme.emoji}</Text>
      <View style={styles.gamePillInfo}>
        <Text style={styles.gamePillCategory} numberOfLines={1}>
          {cleanCategoryName(item.category)}
        </Text>
        <Text style={styles.gamePillDate}>{formatRelativeDate(item.completedAt)}</Text>
      </View>
      <Text style={styles.gamePillScore}>
        {item.myScore} - {item.opponentScore}
      </Text>
      <View style={[styles.resultBadge, { backgroundColor: resultColor + '20' }]}>
        <Text style={[styles.resultBadgeText, { color: resultColor }]}>{resultLabel}</Text>
      </View>
    </View>
  );
}

export default function FriendProfileOverlay({
  visible,
  friend,
  onClose,
  onChallenge,
}: FriendProfileOverlayProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FriendHistoryResponse | null>(null);

  useEffect(() => {
    if (!visible || !friend) {
      setData(null);
      setError(null);
      setLoading(true);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.get<FriendHistoryResponse>(`/friends/${friend.id}/history`);
        if (!cancelled) setData(result);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [visible, friend?.id]);

  if (!visible || !friend) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
    >
      <View style={[styles.sheet, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 5 }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.brand.primary} size="large" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : data ? (
          <>
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Profile */}
              <View style={styles.profileSection}>
                <View style={styles.largeAvatar}>
                  <Text style={styles.largeAvatarText}>
                    {getAvatar(friend.avatar_id)?.emoji ?? friend.username[0]?.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.username}>{friend.username}</Text>
                <Text style={styles.friendsSince}>
                  Friends since {formatFriendsSince(data.friendsSince)}
                </Text>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <StatBox label="Wins" value={data.stats.wins} color={colors.correct} />
                <StatBox label="Losses" value={data.stats.losses} color={colors.wrong} />
                <StatBox label="Ties" value={data.stats.ties} color={colors.gold} />
              </View>

              {/* Win rate bar */}
              <View style={styles.winRateSection}>
                <View style={styles.winRateHeader}>
                  <Text style={styles.winRateLabel}>Win Rate</Text>
                  <Text style={styles.winRateValue}>{data.stats.winRate}%</Text>
                </View>
                <View style={styles.winRateBarBg}>
                  <View
                    style={[
                      styles.winRateBarFill,
                      { width: `${data.stats.winRate}%` },
                    ]}
                  />
                </View>
              </View>

              {/* Game history */}
              <Text style={styles.sectionLabel}>RECENT GAMES</Text>

              {data.games.length === 0 ? (
                <View style={styles.emptyGames}>
                  <Text style={styles.emptyGamesIcon}>⚔️</Text>
                  <Text style={styles.emptyGamesText}>No games played yet</Text>
                  <Text style={styles.emptyGamesSubtext}>
                    Challenge {friend.username} to your first match!
                  </Text>
                </View>
              ) : (
                data.games.map((game) => <GamePill key={game.id} item={game} />)
              )}
            </ScrollView>

            {/* Bottom CTA */}
            <TouchableOpacity
              style={styles.challengeCta}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onChallenge(friend.username);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.challengeCtaText}>⚔️ Challenge {friend.username}</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg.primary,
    zIndex: 150,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: colors.text.primary,
    fontSize: 18,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Profile
  profileSection: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  largeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand.primary + '25',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.brand.primary + '40',
  },
  largeAvatarText: {
    color: colors.text.primary,
    fontSize: 26,
    fontWeight: '800',
  },
  username: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  friendsSince: {
    color: colors.text.secondary,
    fontSize: 13,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  // Win rate
  winRateSection: {
    marginBottom: 20,
  },
  winRateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  winRateLabel: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  winRateValue: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  winRateBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bg.elevated,
    overflow: 'hidden',
  },
  winRateBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.correct,
  },
  // Section label
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  // Game pills
  gamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderLeftWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gamePillEmoji: {
    fontSize: 20,
  },
  gamePillInfo: {
    flex: 1,
    gap: 2,
  },
  gamePillCategory: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  gamePillDate: {
    color: colors.text.secondary,
    fontSize: 11,
  },
  gamePillScore: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  resultBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  // Empty games
  emptyGames: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyGamesIcon: {
    fontSize: 36,
  },
  emptyGamesText: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyGamesSubtext: {
    color: colors.text.secondary,
    fontSize: 13,
    textAlign: 'center',
  },
  // CTA
  challengeCta: {
    backgroundColor: colors.cta,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: colors.cta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  challengeCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
