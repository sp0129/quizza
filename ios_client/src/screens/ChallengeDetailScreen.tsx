import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, gradients } from '../theme/colors';
import { getCategoryTheme } from '../utils/categoryThemes';
import { api } from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'ChallengeDetail'>;

interface LeaderboardEntry {
  rank: number;
  username: string;
  total_score: number;
  correct_count: number;
  total_questions: number;
  is_current_user: boolean;
}

interface ChallengeDetail {
  id: string;
  category: string;
  mode: string;
  posted_by_username: string;
  posted_at: string;
  expires_at: string;
  player_count: number;
  high_score: number;
  leaderboard: LeaderboardEntry[];
  user_attempt: {
    total_score: number;
    correct_count: number;
    rank: number;
  } | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function rankEmoji(rank: number): string {
  if (rank === 1) return '\uD83E\uDD47';
  if (rank === 2) return '\uD83E\uDD48';
  if (rank === 3) return '\uD83E\uDD49';
  return `${rank}.`;
}

export default function ChallengeDetailScreen({ route, navigation }: Props) {
  const { challengeId } = route.params;
  const insets = useSafeAreaInsets();

  const [detail, setDetail] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const data = await api.get<ChallengeDetail>(`/open-challenges/${challengeId}`);
      setDetail(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handlePlay = async () => {
    if (!detail) return;
    setStarting(true);
    try {
      const result = await api.post<{
        gameId: string;
        questionSetId: string;
        category: string;
        mode: string;
      }>(`/open-challenges/${challengeId}/start`, {});

      const questionCount = detail.mode === '5Q' ? 5 : 10;
      navigation.replace('Game', {
        gameId: result.gameId,
        mode: 'solo',
        questionSetId: result.questionSetId,
        category: result.category,
        timer: 30,
        questionCount,
        openChallengeId: challengeId,
      });
    } catch (err: any) {
      const msg = err.message || 'Failed to start challenge';
      Alert.alert('Error', msg);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={gradients.game} style={styles.flex}>
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <ActivityIndicator color={colors.brand.primary} size="large" />
        </View>
      </LinearGradient>
    );
  }

  if (!detail) {
    return (
      <LinearGradient colors={gradients.game} style={styles.flex}>
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <Text style={styles.errorText}>Challenge not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const theme = getCategoryTheme(detail.category);
  const alreadyPlayed = detail.user_attempt != null;
  const expired = new Date(detail.expires_at) < new Date();
  const count = detail.player_count;

  // Contextual CTA message based on player count
  const ctaMessage = (() => {
    if (count <= 1) return 'Be the first to take this challenge!';
    if (count <= 5) return 'Think you can come out on top?';
    if (count <= 20) return `${count} players so far. Can you crack the top 5?`;
    if (count <= 50) return `${count} players and counting. Can you make the top 10?`;
    return `${count} players have tried. Do you have what it takes?`;
  })();

  return (
    <LinearGradient colors={gradients.game} style={styles.flex}>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top + 12 }]}
        contentContainerStyle={styles.content}
      >
        {/* Back button */}
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>

        {/* Challenge header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>{theme.emoji}</Text>
          <Text style={styles.headerTitle}>{detail.category}</Text>
          <View style={[styles.modeBadge, detail.mode === '5Q' ? styles.modeBadge5 : styles.modeBadge10]}>
            <Text style={styles.modeBadgeText}>{detail.mode}</Text>
          </View>
        </View>

        <Text style={styles.postedBy}>
          Posted by @{detail.posted_by_username} · {timeAgo(detail.posted_at)}
        </Text>

        {/* Stats row — hide high score if not played */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{count}</Text>
            <Text style={styles.statLabel}>{count === 1 ? 'Player' : 'Players'}</Text>
          </View>
          {alreadyPlayed ? (
            <>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{detail.high_score}</Text>
                <Text style={styles.statLabel}>High Score</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.correct }]}>{detail.user_attempt!.total_score}</Text>
                <Text style={styles.statLabel}>Your Score</Text>
              </View>
            </>
          ) : (
            <View style={styles.statBox}>
              <Text style={styles.statValue}>?</Text>
              <Text style={styles.statLabel}>High Score</Text>
            </View>
          )}
        </View>

        {/* User rank (only after playing) */}
        {alreadyPlayed && (
          <View style={styles.rankBanner}>
            <Text style={styles.rankText}>
              Your Rank: #{detail.user_attempt!.rank} of {count}
            </Text>
          </View>
        )}

        {/* Play button — ABOVE leaderboard so it's always accessible */}
        <View style={styles.actionSection}>
          {expired ? (
            <View style={styles.expiredBanner}>
              <Text style={styles.expiredText}>This challenge has expired</Text>
            </View>
          ) : alreadyPlayed ? (
            <View style={styles.playedBanner}>
              <Text style={styles.playedText}>You've already played this challenge</Text>
            </View>
          ) : (
            <View style={styles.ctaSection}>
              <Text style={styles.ctaMessage}>{ctaMessage}</Text>
              <TouchableOpacity
                style={styles.playBtn}
                onPress={handlePlay}
                activeOpacity={0.8}
                disabled={starting}
              >
                {starting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.playBtnText}>Play This Challenge</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Leaderboard — scores hidden until played */}
        <Text style={styles.sectionTitle}>Leaderboard</Text>
        {detail.leaderboard.length === 0 ? (
          <Text style={styles.emptyLeaderboard}>No submissions yet</Text>
        ) : (
          detail.leaderboard.map(entry => (
            <View
              key={`${entry.rank}-${entry.username}`}
              style={[
                styles.lbRow,
                entry.is_current_user && styles.lbRowCurrent,
              ]}
            >
              <Text style={styles.lbRank}>{rankEmoji(entry.rank)}</Text>
              <Text style={[styles.lbUsername, entry.is_current_user && styles.lbUsernameCurrent]} numberOfLines={1}>
                {entry.is_current_user ? 'YOU' : `@${entry.username}`}
              </Text>
              {alreadyPlayed ? (
                <Text style={styles.lbScore}>{entry.total_score} pts</Text>
              ) : (
                <Text style={styles.lbScoreHidden}>???</Text>
              )}
            </View>
          ))
        )}
        {!alreadyPlayed && detail.leaderboard.length > 0 && (
          <Text style={styles.hiddenHint}>Play to reveal scores</Text>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, paddingHorizontal: 20 },
  content: { paddingBottom: 40 },
  errorText: { fontSize: 16, color: colors.text.secondary, marginBottom: 16 },

  // Back
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backArrow: { fontSize: 20, color: colors.text.secondary },
  backLabel: { fontSize: 14, color: colors.text.secondary, fontWeight: '600' },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.bg.elevated,
  },
  backBtnText: { color: colors.text.primary, fontWeight: '600' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  headerEmoji: { fontSize: 28 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text.primary, flex: 1 },
  modeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  modeBadge5: { backgroundColor: colors.cyan + '30' },
  modeBadge10: { backgroundColor: colors.brand.primary + '30' },
  modeBadgeText: { fontSize: 12, fontWeight: '700', color: colors.text.primary },
  postedBy: { fontSize: 13, color: colors.text.secondary, marginBottom: 20 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text.primary },
  statLabel: { fontSize: 11, color: colors.text.secondary, fontWeight: '600', marginTop: 2 },

  // Rank banner
  rankBanner: {
    backgroundColor: colors.brand.primary + '20',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.brand.primary + '40',
  },
  rankText: { fontSize: 14, fontWeight: '700', color: colors.brand.primary },

  // Leaderboard
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 10,
  },
  emptyLeaderboard: { fontSize: 13, color: colors.text.secondary, fontStyle: 'italic' },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  lbRowCurrent: {
    backgroundColor: colors.brand.primary + '15',
    borderWidth: 1,
    borderColor: colors.brand.primary + '30',
  },
  lbRank: { fontSize: 16, width: 32, fontWeight: '700', color: colors.text.primary },
  lbUsername: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text.primary },
  lbUsernameCurrent: { color: colors.brand.primary },
  lbScore: { fontSize: 14, fontWeight: '700', color: colors.text.secondary },
  lbScoreHidden: { fontSize: 14, fontWeight: '700', color: colors.text.secondary + '40' },
  hiddenHint: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },

  // Actions
  actionSection: { marginBottom: 20 },
  ctaSection: { gap: 12 },
  ctaMessage: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  playBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#16A34A',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  playBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  playedBanner: {
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border + '30',
  },
  playedText: { fontSize: 14, color: colors.text.secondary, fontWeight: '600' },
  expiredBanner: {
    backgroundColor: colors.wrong + '15',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.wrong + '30',
  },
  expiredText: { fontSize: 14, color: colors.wrong, fontWeight: '600' },
});
