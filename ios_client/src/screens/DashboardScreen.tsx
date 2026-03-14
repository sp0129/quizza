import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { useChallenges } from '../hooks/useChallenges';
import { useDashboardStore } from '../stores/dashboard';
import { api } from '../api/client';
import { colors } from '../theme/colors';
import StatusBarHeader from '../components/dashboard/StatusBarHeader';
import MetricsPill from '../components/dashboard/MetricsPill';
import ModeCard from '../components/dashboard/ModeCard';
import BottomNav from '../components/dashboard/BottomNav';
import ChallengePill from '../components/dashboard/ChallengePill';
import UserSearchOverlay from '../components/dashboard/UserSearchOverlay';
import EmptyState from '../components/dashboard/EmptyState';
import OnboardingOverlay from '../components/OnboardingOverlay';
import type { RootStackParamList } from '../../App';
import type { Challenge, SearchedUser } from '../stores/dashboard';

const ONBOARDING_KEY = 'quizza_onboarding_completed';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  const { user, logout, isGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    challenges,
    challengesLoading,
    fetchChallenges,
    acceptChallenge,
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
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Split challenges into incoming, waiting (outgoing), and completed
  const incomingChallenges = challenges.filter(
    (c) => c.status === 'incoming' || c.status === 'your_turn',
  );
  const waitingChallenges = challenges.filter(
    (c) => c.status === 'waiting',
  );
  const completedChallenges = challenges.filter(
    (c) => c.status === 'completed',
  );

  // Check for first-time user onboarding
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      if (!value) {
        setShowOnboarding(true);
      }
    });
  }, []);

  const dismissOnboarding = useCallback(async () => {
    setShowOnboarding(false);
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  }, []);

  const handleOnboardingCreateRoom = useCallback(async () => {
    await dismissOnboarding();
    if (isGuest) {
      navigation.navigate('Signup');
      return;
    }
    navigation.navigate('Category', { mode: 'room' });
  }, [dismissOnboarding, isGuest, navigation]);

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
      .catch(() => {});
  }, [setMetrics]);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChallenges();
    setRefreshing(false);
  }, [fetchChallenges]);

  // Incoming challenge pill tap → accept and play
  const handleIncomingPress = useCallback(
    async (challenge: Challenge) => {
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

  // Mode card actions
  const handleSolo = useCallback(() => {
    navigation.navigate('Category', { mode: 'solo' });
  }, [navigation]);

  const handleGroupPlay = useCallback(() => {
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

  // User search selection → navigate to category screen with challenge target
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
        case 'home':
          break;
        case 'leaderboard':
          navigation.navigate('Leaderboard');
          break;
        case 'friends':
          navigation.navigate('Friends');
          break;
        case 'profile':
          navigation.navigate('Profile');
          break;
      }
    },
    [navigation],
  );

  const handleShareInviteLink = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const inviteLink = `https://quizza.app/invite/${user?.username ?? 'friend'}`;
    try {
      const result = await Share.share({
        message: `Join me on Quizza! Let's play trivia together. ${inviteLink}`,
        url: inviteLink,
      });
      if (result.action === Share.dismissedAction) return;
      await Clipboard.setStringAsync(inviteLink);
    } catch {
      await Clipboard.setStringAsync(inviteLink);
      Alert.alert('Copied!', 'Invite link copied to clipboard.');
    }
  }, [user?.username]);

  const handleLogout = useCallback(() => {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }, [logout]);

  const username = user?.username ?? 'Player';
  const avatarInitial = username[0]?.toUpperCase() ?? 'P';
  const hasAnyChallenges = incomingChallenges.length > 0 || waitingChallenges.length > 0 || completedChallenges.length > 0;

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}
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
          <MetricsPill icon="🔥" label="Streak" value={metrics.streak} color="#F97316" />
          <MetricsPill icon="🏆" label="Wins" value={metrics.wins} color={colors.brand.primary} />
          <MetricsPill icon="📊" label="Win %" value={metrics.winRate} suffix="%" color={colors.brand.secondary} />
        </Animated.View>

        {/* ═══ GAME MODES ═══ */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.modeSection}>
          <Text style={styles.sectionLabel}>GAME MODES</Text>
          <View style={styles.modeStack}>
            <ModeCard
              icon="🎯"
              label="Solo"
              color="#0F5A9F"
              gem={{ base: '#0F5A9F', light: '#1E90FF', dark: '#0A3A6B' }}
              onPress={handleSolo}
              subtitle="Play now"
            />
            <ModeCard
              icon="👥"
              label="Group Play"
              color="#6B21A8"
              gem={{ base: '#6B21A8', light: '#A855F7', dark: '#4A1271' }}
              onPress={handleGroupPlay}
              subtitle="Play with friends"
            />
            <ModeCard
              icon="⚔️"
              label="Challenge"
              color="#B8571A"
              gem={{ base: '#B8571A', light: '#EA8C35', dark: '#7A3A0F' }}
              badgeCount={pendingCount}
              onPress={handleChallenge}
              subtitle="vs your friends"
            />
          </View>
        </Animated.View>

        {/* Quick join room */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.joinSection}>
          <Text style={styles.sectionLabel}>JOIN A ROOM</Text>
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
              style={[styles.joinBtn, (!roomCode.trim() || joinLoading) && styles.joinBtnDisabled]}
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

        {/* ═══ INCOMING CHALLENGES ═══ */}
        {incomingChallenges.length > 0 && (
          <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.challengeSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>⚔️</Text>
              <Text style={styles.sectionLabel}>INCOMING CHALLENGES</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{incomingChallenges.length}</Text>
              </View>
            </View>
            <FlatList
              data={incomingChallenges}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillScroll}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ChallengePill
                  challengeId={item.id}
                  opponentUsername={item.opponentUsername}
                  category={item.category}
                  type="incoming"
                  timeSent={item.createdAt}
                  onPress={() => handleIncomingPress(item)}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            />
          </Animated.View>
        )}

        {/* ═══ OUTGOING / WAITING CHALLENGES ═══ */}
        {waitingChallenges.length > 0 && (
          <Animated.View entering={FadeInDown.delay(420).duration(400)} style={styles.challengeSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>⏳</Text>
              <Text style={styles.sectionLabel}>OUTGOING CHALLENGES</Text>
              <View style={[styles.countBadge, { backgroundColor: '#06B6D4' }]}>
                <Text style={styles.countText}>{waitingChallenges.length}</Text>
              </View>
            </View>
            <FlatList
              data={waitingChallenges}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillScroll}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ChallengePill
                  challengeId={item.id}
                  opponentUsername={item.opponentUsername}
                  category={item.category}
                  type="waiting"
                  timeSent={item.createdAt}
                  onPress={() => {
                    // Waiting cards are not tappable (disabled in ChallengePill)
                  }}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            />
          </Animated.View>
        )}

        {/* ═══ COMPLETED CHALLENGES ═══ */}
        {completedChallenges.length > 0 && (
          <Animated.View entering={FadeInDown.delay(450).duration(400)} style={styles.challengeSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📋</Text>
              <Text style={styles.sectionLabel}>YOUR RESULTS</Text>
            </View>
            <FlatList
              data={completedChallenges}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillScroll}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ChallengePill
                  challengeId={item.id}
                  opponentUsername={item.opponentUsername}
                  category={item.category}
                  type="outgoing"
                  myScore={item.myScore}
                  opponentScore={item.opponentScore}
                  won={item.won}
                  tied={item.tied}
                  onPress={() => {
                    const result: 'win' | 'loss' | 'tie' = item.won
                      ? 'win'
                      : item.tied
                        ? 'tie'
                        : 'loss';
                    navigation.navigate('Results', {
                      yourScore: item.myScore ?? 0,
                      opponentScore: item.opponentScore,
                      opponentHandle: item.opponentHandle,
                      opponentUsername: item.opponentUsername,
                      category: item.category,
                      gameMode: 'challenge',
                      timestamp: item.createdAt,
                      result,
                      challengeId: item.id,
                    });
                  }}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            />
          </Animated.View>
        )}

        {/* Empty state: no challenges at all */}
        {!challengesLoading && !hasAnyChallenges && !isGuest && (
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <EmptyState
              icon="🎯"
              title="Ready for a challenge?"
              description="Pick a friend and put your knowledge to the test."
              ctaLabel="Challenge a Friend"
              onCtaPress={handleChallenge}
              secondaryLabel="Search Friends"
              onSecondaryPress={() => navigation.navigate('Friends')}
            />
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom navigation */}
      <BottomNav
        activeTab="home"
        onTabPress={handleTabPress}
        badges={{ home: pendingCount }}
      />

      {/* User search overlay */}
      <UserSearchOverlay
        visible={searchOverlayVisible}
        onClose={() => setSearchOverlayVisible(false)}
        onSelectUser={handleUserSelect}
      />

      {/* Onboarding overlay for first-time users */}
      <OnboardingOverlay
        visible={showOnboarding}
        onCreateRoom={handleOnboardingCreateRoom}
        onDismiss={dismissOnboarding}
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
    gap: 24,
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

  // Sections
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 10,
  },
  sectionIcon: {
    fontSize: 16,
  },
  countBadge: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // Game modes
  modeSection: {
    paddingHorizontal: 20,
    gap: 10,
  },
  modeStack: {
    gap: 14,
  },

  // Join room
  joinSection: {
    paddingHorizontal: 16,
    gap: 10,
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

  // Challenge pill sections
  challengeSection: {
    gap: 0,
  },
  pillScroll: {
    paddingHorizontal: 16,
  },
});
