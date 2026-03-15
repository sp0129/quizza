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
import { getAvatar } from '../utils/avatars';
import StatusBarHeader from '../components/dashboard/StatusBarHeader';
import MetricsPill from '../components/dashboard/MetricsPill';
import ModeCard from '../components/dashboard/ModeCard';
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
    markChallengeSeen,
  } = useDashboardStore();

  const [roomCode, setRoomCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const MAX_VISIBLE = 3;
  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Split challenges into incoming, waiting (outgoing), and completed
  const incomingChallenges = challenges.filter(
    (c) => c.status === 'incoming' || c.status === 'your_turn',
  );
  const waitingChallenges = challenges.filter(
    (c) => c.status === 'waiting',
  );
  const completedChallenges = challenges
    .filter((c) => c.status === 'completed')
    .sort((a, b) => {
      const aSeen = a.seen ? 1 : 0;
      const bSeen = b.seen ? 1 : 0;
      return aSeen - bSeen; // unseen first, seen last
    });


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
    navigation.navigate('Friends');
  }, [isGuest, navigation]);

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
  const avatarInitial = getAvatar(user?.avatar_id)?.emoji ?? username[0]?.toUpperCase() ?? 'P';
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
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

        {/* ═══ GAME MODES (2×2 Grid) ═══ */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.modeSection}>
          <Text style={styles.sectionLabel}>GAME MODES</Text>
          <View style={styles.modeGrid}>
            <View style={styles.modeGridRow}>
              <ModeCard
                icon="🎯"
                label="Solo"
                color="#0F5A9F"
                gem={{ base: '#0F5A9F', light: '#1E90FF', dark: '#0A3A6B' }}
                onPress={handleSolo}
                subtitle="Play now"
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
            <View style={styles.modeGridRow}>
              <ModeCard
                icon="➕"
                label="Create Room"
                color="#6B21A8"
                gem={{ base: '#6B21A8', light: '#A855F7', dark: '#4A1271' }}
                onPress={handleGroupPlay}
                subtitle="Play w/ friends"
              />
              <ModeCard
                icon="🚪"
                label="Join Room"
                color="#0E7490"
                gem={{ base: '#0E7490', light: '#22D3EE', dark: '#064E5B' }}
                onPress={() => setJoinModalVisible(true)}
                subtitle="Enter a code"
              />
            </View>
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
            <View style={styles.challengeList}>
              {(expandedSections.incoming ? incomingChallenges : incomingChallenges.slice(0, MAX_VISIBLE)).map((item) => (
                <ChallengePill
                  key={item.id}
                  challengeId={item.id}
                  opponentUsername={item.opponentUsername}
                  category={item.category}
                  type="incoming"
                  timeSent={item.createdAt}
                  onPress={() => handleIncomingPress(item)}
                />
              ))}
              {incomingChallenges.length > MAX_VISIBLE && (
                <TouchableOpacity style={styles.seeAllBtn} onPress={() => toggleSection('incoming')}>
                  <Text style={styles.seeAllText}>
                    {expandedSections.incoming ? 'Show less' : `See all ${incomingChallenges.length}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
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
            <View style={styles.challengeList}>
              {(expandedSections.waiting ? waitingChallenges : waitingChallenges.slice(0, MAX_VISIBLE)).map((item) => (
                <ChallengePill
                  key={item.id}
                  challengeId={item.id}
                  opponentUsername={item.opponentUsername}
                  category={item.category}
                  type="waiting"
                  timeSent={item.createdAt}
                  onPress={() => {}}
                />
              ))}
              {waitingChallenges.length > MAX_VISIBLE && (
                <TouchableOpacity style={styles.seeAllBtn} onPress={() => toggleSection('waiting')}>
                  <Text style={styles.seeAllText}>
                    {expandedSections.waiting ? 'Show less' : `See all ${waitingChallenges.length}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* ═══ COMPLETED CHALLENGES ═══ */}
        {completedChallenges.length > 0 && (
          <Animated.View entering={FadeInDown.delay(450).duration(400)} style={styles.challengeSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📋</Text>
              <Text style={styles.sectionLabel}>YOUR RESULTS</Text>
            </View>
            <View style={styles.challengeList}>
              {(expandedSections.results ? completedChallenges : completedChallenges.slice(0, MAX_VISIBLE)).map((item) => (
                <ChallengePill
                  key={item.id}
                  challengeId={item.id}
                  opponentUsername={item.opponentUsername}
                  category={item.category}
                  type="outgoing"
                  myScore={item.myScore}
                  opponentScore={item.opponentScore}
                  won={item.won}
                  tied={item.tied}
                  seen={item.seen}
                  onPress={async () => {
                    const isSeen = item.seen;
                    if (!isSeen) await markChallengeSeen(item.id);
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
                      skipAnimation: isSeen,
                    });
                  }}
                />
              ))}
              {completedChallenges.length > MAX_VISIBLE && (
                <TouchableOpacity style={styles.seeAllBtn} onPress={() => toggleSection('results')}>
                  <Text style={styles.seeAllText}>
                    {expandedSections.results ? 'Show less' : `See all ${completedChallenges.length}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
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

      {/* User search overlay */}
      <UserSearchOverlay
        visible={searchOverlayVisible}
        onClose={() => setSearchOverlayVisible(false)}
        onSelectUser={handleUserSelect}
      />

      {/* Join room modal */}
      {joinModalVisible && (
        <TouchableOpacity
          style={styles.joinOverlay}
          activeOpacity={1}
          onPress={() => { setJoinModalVisible(false); setRoomCode(''); }}
        >
          <TouchableOpacity activeOpacity={1} style={styles.joinModal} onPress={() => {}}>
            <Text style={styles.joinModalTitle}>🚪 Join a Room</Text>
            <TextInput
              style={styles.joinModalInput}
              placeholder="ROOM CODE"
              placeholderTextColor={colors.text.secondary}
              value={roomCode}
              onChangeText={(t) => setRoomCode(t.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              onSubmitEditing={joinRoom}
            />
            <View style={styles.joinModalRow}>
              <TouchableOpacity
                style={styles.joinModalCancel}
                onPress={() => { setJoinModalVisible(false); setRoomCode(''); }}
              >
                <Text style={styles.joinModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.joinModalSubmit, (!roomCode.trim() || joinLoading) && styles.joinModalSubmitDisabled]}
                onPress={() => { joinRoom(); setJoinModalVisible(false); }}
                disabled={!roomCode.trim() || joinLoading}
              >
                {joinLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.joinModalSubmitText}>Join →</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

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
  modeGrid: {
    gap: 10,
  },
  modeGridRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // Join room modal
  joinOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  joinModal: {
    backgroundColor: colors.bg.surface,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border + '30',
  },
  joinModalTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  joinModalInput: {
    backgroundColor: colors.bg.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 4,
    borderWidth: 1,
    borderColor: colors.border + '30',
    textAlign: 'center',
  },
  joinModalRow: {
    flexDirection: 'row',
    gap: 10,
  },
  joinModalCancel: {
    flex: 1,
    backgroundColor: colors.bg.elevated,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  joinModalCancelText: {
    color: colors.text.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  joinModalSubmit: {
    flex: 1,
    backgroundColor: '#0E7490',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  joinModalSubmitDisabled: {
    opacity: 0.4,
  },
  joinModalSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Challenge sections
  challengeSection: {
    gap: 0,
  },
  challengeList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  seeAllBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  seeAllText: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
