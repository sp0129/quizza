import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { useChallenges } from '../hooks/useChallenges';
import { useDashboardStore } from '../stores/dashboard';
import { api } from '../api/client';
import { colors } from '../theme/colors';
import StatusBarHeader from '../components/dashboard/StatusBarHeader';
import MetricsPill from '../components/dashboard/MetricsPill';
import ChallengesFeed from '../components/dashboard/ChallengesFeed';
import ModeCard from '../components/dashboard/ModeCard';
import BottomNav from '../components/dashboard/BottomNav';
import UserSearchOverlay from '../components/dashboard/UserSearchOverlay';
import EmptyState from '../components/dashboard/EmptyState';
import type { RootStackParamList } from '../../App';
import type { SearchedUser } from '../stores/dashboard';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  const { user, logout, isGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    challenges,
    challengesLoading,
    fetchChallenges,
    acceptChallenge,
    declineChallenge,
    pendingCount,
  } = useChallenges();

  const {
    metrics,
    setMetrics,
    searchOverlayVisible,
    setSearchOverlayVisible,
  } = useDashboardStore();

  const [roomCode, setRoomCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user metrics
  useEffect(() => {
    api
      .get<{
        streak?: number;
        wins?: number;
        winRate?: number;
        rank?: number;
        level?: number;
        gems?: number;
        xp?: number;
        xpToNextLevel?: number;
      }>('/users/me/stats')
      .then((stats) => {
        setMetrics({
          streak: stats.streak ?? 0,
          wins: stats.wins ?? 0,
          winRate: stats.winRate ?? 0,
          rank: stats.rank,
          level: stats.level ?? 1,
          gems: stats.gems ?? 0,
          xp: stats.xp ?? 0,
          xpToNextLevel: stats.xpToNextLevel ?? 100,
        });
      })
      .catch(() => {
        // Use defaults — metrics stay at initial values
      });
  }, [setMetrics]);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChallenges();
    setRefreshing(false);
  }, [fetchChallenges]);

  // Challenge actions
  const handleAcceptChallenge = useCallback(
    async (challenge: (typeof challenges)[0]) => {
      try {
        const result = await acceptChallenge(challenge);
        navigation.navigate('Game', {
          gameId: result.gameId,
          mode: 'async',
          questionSetId: result.questionSetId,
          category: result.category,
          timer: 30,
        });
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to accept challenge');
      }
    },
    [acceptChallenge, navigation],
  );

  const handleDeclineChallenge = useCallback(
    async (challenge: (typeof challenges)[0]) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await declineChallenge(challenge);
    },
    [declineChallenge],
  );

  const handleChallengePress = useCallback(
    (challenge: (typeof challenges)[0]) => {
      if (challenge.status === 'incoming' || challenge.status === 'your_turn') {
        handleAcceptChallenge(challenge);
      }
    },
    [handleAcceptChallenge],
  );

  // Mode card actions
  const handleSolo = useCallback(() => {
    navigation.navigate('Category', { mode: 'solo' });
  }, [navigation]);

  const handleRoom = useCallback(() => {
    if (isGuest) {
      navigation.navigate('Signup');
      return;
    }
    navigation.navigate('Category', { mode: 'room' });
  }, [navigation, isGuest]);

  const handleChallenge = useCallback(() => {
    if (isGuest) {
      navigation.navigate('Signup');
      return;
    }
    setSearchOverlayVisible(true);
  }, [isGuest, navigation, setSearchOverlayVisible]);

  // Room join
  const joinRoom = useCallback(async () => {
    if (!roomCode.trim()) return;
    setJoinLoading(true);
    try {
      const result = await api.post<{
        roomId: string;
        roomCode: string;
        questionSetId: string;
        category: string;
        timerSeconds?: number;
      }>('/rooms/join', { roomCode: roomCode.trim().toUpperCase() });
      navigation.navigate('Room', {
        roomId: result.roomId,
        questionSetId: result.questionSetId,
        category: result.category,
        roomCode: result.roomCode,
        isHost: false,
        timer: result.timerSeconds ?? 30,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not join room');
    } finally {
      setJoinLoading(false);
    }
  }, [roomCode, navigation]);

  // FAB Play action — default to solo
  const handlePlayFab = useCallback(() => {
    navigation.navigate('Category', { mode: 'solo' });
  }, [navigation]);

  // User search selection — navigate to category screen with challenge target
  const handleUserSelect = useCallback(
    (selectedUser: SearchedUser) => {
      setSearchOverlayVisible(false);
      navigation.navigate('Category', {
        mode: 'challenge',
        target: selectedUser.username,
      });
    },
    [navigation, setSearchOverlayVisible],
  );

  // Bottom nav
  const handleTabPress = useCallback(
    (key: string) => {
      switch (key) {
        case 'profile':
          navigation.navigate('Profile');
          break;
        case 'home':
          // Already on home
          break;
        default:
          // Other tabs not yet implemented
          break;
      }
    },
    [navigation],
  );

  const handleLogout = useCallback(() => {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }, [logout]);

  const username = user?.username ?? 'Player';
  const avatarInitial = username[0]?.toUpperCase() ?? 'P';

  return (
    <View style={[styles.root, styles.container]}>
        {/* Status bar header */}
        <StatusBarHeader
          username={username}
          metrics={metrics}
          avatarInitial={avatarInitial}
          onProfilePress={() => navigation.navigate('Profile')}
        />

        {/* Scrollable content */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.brand.primary}
              progressViewOffset={10}
            />
          }
        >
          {/* Guest upsell */}
          {isGuest && (
            <Animated.View entering={FadeInDown.delay(100).duration(300)}>
              <TouchableOpacity
                style={styles.guestBanner}
                onPress={() => navigation.navigate('Signup')}
                activeOpacity={0.8}
              >
                <Text style={styles.guestTitle}>Playing as guest</Text>
                <Text style={styles.guestBody}>
                  Create a free account to challenge friends, join rooms, and save scores →
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Metrics row */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.metricsRow}>
            <MetricsPill
              icon="🔥"
              label="Streak"
              value={metrics.streak}
              color="#F97316"
            />
            <MetricsPill
              icon="🏆"
              label="Wins"
              value={metrics.wins}
              color={colors.brand.primary}
            />
            <MetricsPill
              icon="📊"
              label="Win %"
              value={metrics.winRate}
              suffix="%"
              color={colors.brand.secondary}
            />
          </Animated.View>

          {/* Challenge feed */}
          <Animated.View entering={FadeInDown.delay(250).duration(400)}>
            <ChallengesFeed
              challenges={challenges}
              loading={challengesLoading}
              onAccept={handleAcceptChallenge}
              onDecline={handleDeclineChallenge}
              onPress={handleChallengePress}
              onRefresh={handleRefresh}
              onChallengeNewFriend={handleChallenge}
            />
          </Animated.View>

          {/* Mode cards */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.modeSection}>
            <Text style={styles.modeLabel}>GAME MODES</Text>
            <View style={styles.modeRow}>
              <ModeCard
                icon="🎯"
                label="Solo"
                color={colors.brand.primary}
                onPress={handleSolo}
                subtitle="Quick play"
              />
              <ModeCard
                icon="👥"
                label="Room"
                color={colors.brand.secondary}
                onPress={handleRoom}
                subtitle="Live match"
              />
              <ModeCard
                icon="⚔️"
                label="Challenge"
                color="#F97316"
                badgeCount={pendingCount}
                onPress={handleChallenge}
                subtitle="Dare a friend"
              />
            </View>
          </Animated.View>

          {/* Quick join room */}
          <Animated.View entering={FadeInDown.delay(450).duration(400)} style={styles.joinSection}>
            <Text style={styles.joinLabel}>JOIN A ROOM</Text>
            <View style={styles.joinRow}>
              <TextInput
                style={styles.joinInput}
                placeholder="Enter room code"
                placeholderTextColor={colors.text.secondary}
                value={roomCode}
                onChangeText={(t) => setRoomCode(t.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                onSubmitEditing={joinRoom}
              />
              <TouchableOpacity
                style={[
                  styles.joinBtn,
                  (!roomCode.trim() || joinLoading) && styles.joinBtnDisabled,
                ]}
                onPress={joinRoom}
                disabled={!roomCode.trim() || joinLoading}
                activeOpacity={0.8}
              >
                {joinLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.joinBtnText}>Join →</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Bottom navigation */}
        <BottomNav
          activeTab="home"
          onTabPress={handleTabPress}
          onPlayPress={handlePlayFab}
          badges={{ home: pendingCount }}
        />

        {/* User search overlay */}
        <UserSearchOverlay
          visible={searchOverlayVisible}
          onClose={() => setSearchOverlayVisible(false)}
          onSelectUser={handleUserSelect}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    gap: 16,
  },

  // Guest banner
  guestBanner: {
    marginHorizontal: 16,
    backgroundColor: colors.brand.secondary + '15',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.brand.secondary + '30',
    gap: 4,
  },
  guestTitle: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  guestBody: {
    color: colors.text.secondary,
    fontSize: 13,
    lineHeight: 18,
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },

  // Mode cards
  modeSection: {
    paddingHorizontal: 16,
    gap: 10,
  },
  modeLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // Join room
  joinSection: {
    paddingHorizontal: 16,
    gap: 10,
  },
  joinLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  joinRow: {
    flexDirection: 'row',
    gap: 10,
  },
  joinInput: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
    borderWidth: 1,
    borderColor: colors.border + '30',
    textAlign: 'center',
  },
  joinBtn: {
    backgroundColor: colors.brand.secondary,
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBtnDisabled: {
    opacity: 0.4,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
