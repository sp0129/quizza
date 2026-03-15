import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_id?: number;
  wins: number;
  winRate: number;
  rank: number;
}

export default function LeaderboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const data = await api.get<LeaderboardEntry[]>('/users/leaderboard');
      setEntries(data);
    } catch {
      // Keep existing data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const renderItem = useCallback(({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = item.rank ?? index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
    return (
      <View style={styles.row}>
        <View style={styles.rankCol}>
          {medal ? (
            <Text style={styles.medal}>{medal}</Text>
          ) : (
            <Text style={styles.rankText}>{rank}</Text>
          )}
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.username[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.username}</Text>
          <Text style={styles.stat}>{item.wins} wins · {item.winRate}%</Text>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ width: 36 }} />
        <Text style={styles.title}>Leaderboard</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.brand.primary} size="large" />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyTitle}>No rankings yet</Text>
          <Text style={styles.emptyDesc}>Play some games to see the leaderboard!</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingHorizontal: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.brand.primary}
            />
          }
        />
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyDesc: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  rankCol: {
    width: 32,
    alignItems: 'center',
  },
  medal: {
    fontSize: 22,
  },
  rankText: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '700',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.primary + '25',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.brand.primary + '40',
  },
  avatarText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  stat: {
    color: colors.text.secondary,
    fontSize: 12,
  },
});
