import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Image,
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
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { colors } from '../theme/colors';
import { getAvatar } from '../utils/avatars';
import StatusBarHeader from '../components/dashboard/StatusBarHeader';
import MetricsPill from '../components/dashboard/MetricsPill';
import ModeCard from '../components/dashboard/ModeCard';
import ChallengePill from '../components/dashboard/ChallengePill';
import UserSearchOverlay from '../components/dashboard/UserSearchOverlay';
import EmptyState from '../components/dashboard/EmptyState';
import HeroSection from '../components/dashboard/HeroSection';
import ProgressSection from '../components/dashboard/ProgressSection';
import QuickPlayBar from '../components/dashboard/QuickPlayBar';
import ChallengeHalfSheet from '../components/dashboard/ChallengeHalfSheet';
import OnboardingOverlay from '../components/OnboardingOverlay';
import TransitionOverlay from '../components/TransitionOverlay';
import PizzaMascot from '../components/PizzaMascot';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { consumeDashboardRefresh } from '../utils/refreshFlag';
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

  // New user detection
  const [gamesPlayedTotal, setGamesPlayedTotal] = useState<number | null>(null);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [statsFailed, setStatsFailed] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [lastPlayedCategory, setLastPlayedCategory] = useState<string | null>(null);
  const [lastPlayedQuestionCount, setLastPlayedQuestionCount] = useState<number>(10);

  const [challengeSheetVisible, setChallengeSheetVisible] = useState(false);

  const prevGamesRef = useRef<number | null>(null);

  // Stats-based detection — only evaluated after successful stats load
  // If stats fetch failed (e.g. no network), don't assume new user
  const gpt = gamesPlayedTotal ?? 0;
  const isNewUser = statsLoaded && !statsFailed && (
    (friendsCount === 0 && gpt < 5) ||
    (friendsCount > 0 && gpt === 0)
  );
  const isStateA = isNewUser && gpt === 0;
  const isStateB = isNewUser && gpt > 0;

  // Detect State A → B/C transition (user just played their first game)
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);
  useEffect(() => {
    if (prevGamesRef.current === 0 && gamesPlayedTotal !== null && gamesPlayedTotal > 0) {
      setShowTransitionOverlay(true);
    }
    prevGamesRef.current = gamesPlayedTotal;
  }, [gamesPlayedTotal]);

  // Friend requests
  interface FriendRequest {
    id: string;
    user_id: string;
    username: string;
    avatar_id?: number;
    created_at: string;
  }
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set());

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
    navigation.navigate('Category', { mode: 'room' });
  }, [dismissOnboarding, navigation]);

  // Fetch user metrics — re-fetches every time dashboard gains focus
  const fetchStats = useCallback(() => {
    api
      .get<{
        streak?: number;
        winStreak?: number;
        wins?: number;
        winRate?: number;
        rank?: number;
        level?: number;
        gems?: number;
        xp?: number;
        xpToNextLevel?: number;
        gamesPlayedTotal?: number;
        bestScore?: number;
        lastPlayedCategory?: string | null;
        lastPlayedQuestionCount?: number;
        friendsCount?: number;
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
        setGamesPlayedTotal(stats.gamesPlayedTotal ?? 0);
        setFriendsCount(stats.friendsCount ?? 0);
        setBestScore(stats.bestScore ?? 0);
        setDailyStreak(stats.streak ?? 0);
        setLastPlayedCategory(stats.lastPlayedCategory ?? null);
        setLastPlayedQuestionCount(stats.lastPlayedQuestionCount ?? 10);
        setStatsFailed(false);
        setStatsLoaded(true);
      })
      .catch(() => { setStatsFailed(true); setStatsLoaded(true); });
  }, [setMetrics]);

  // Refetch stats on mount and whenever returning from other screens
  useEffect(() => { fetchStats(); }, []);

  // Check for refresh flag frequently — set by Results screen when a game completes
  // Much cheaper than polling the API — just checks a boolean in memory
  useEffect(() => {
    const interval = setInterval(() => {
      if (consumeDashboardRefresh()) {
        fetchStats();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Fetch friend requests
  const fetchFriendRequests = useCallback(async () => {
    try {
      const data = await api.get<FriendRequest[]>('/friends/requests');
      setFriendRequests(data);
    } catch {}
  }, []);

  useEffect(() => { fetchFriendRequests(); }, [fetchFriendRequests]);

  const handleAcceptRequest = useCallback(async (req: FriendRequest) => {
    setRespondingIds(prev => new Set(prev).add(req.id));
    try {
      await api.post(`/friends/requests/${req.id}/accept`, {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFriendRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setRespondingIds(prev => { const next = new Set(prev); next.delete(req.id); return next; });
    }
  }, []);

  const handleRejectRequest = useCallback(async (req: FriendRequest) => {
    setRespondingIds(prev => new Set(prev).add(req.id));
    try {
      await api.post(`/friends/requests/${req.id}/reject`, {});
      setFriendRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setRespondingIds(prev => { const next = new Set(prev); next.delete(req.id); return next; });
    }
  }, []);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchChallenges(), fetchFriendRequests()]);
    setRefreshing(false);
  }, [fetchChallenges, fetchFriendRequests]);

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
          opponentUsername: challenge.opponentUsername,
          opponentAvatarId: challenge.opponentAvatarId,
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
    navigation.navigate('Category', { mode: 'room' });
  }, [navigation]);

  const handleChallenge = useCallback(() => {
    if (isGuest) {
      Alert.alert(
        'Account Required',
        'Create a free account to challenge friends.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Sign Up', onPress: () => navigation.navigate('Signup') },
        ],
      );
      return;
    }
    // New users: go straight to create open challenge (solo → post)
    if (isNewUser) {
      navigation.navigate('Category', { mode: 'solo', createChallenge: true } as any);
      return;
    }
    // Standard users: show half-sheet with Duel + Create Open Challenge
    setChallengeSheetVisible(true);
  }, [isGuest, isNewUser, navigation]);

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
  const avatarInitial = username[0]?.toUpperCase() ?? 'P';
  const hasAnyChallenges = incomingChallenges.length > 0 || waitingChallenges.length > 0 || completedChallenges.length > 0;

  // Don't render dashboard content until stats are loaded
  // The animated splash overlay covers this gap — user sees the dancing star
  if (!statsLoaded) {
    return <View style={[styles.root, styles.container]} />;
  }

  return (
    <View style={[styles.root, styles.container]}>
      {/* Status bar header */}
      <StatusBarHeader
        username={username}
        metrics={metrics}
        avatarInitial={avatarInitial}
        avatarId={user?.avatar_id}
        greeting={isStateA ? 'Hi! 👋' : isStateB ? 'Welcome back 🎮' : undefined}
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
              <View style={styles.guestBannerRow}>
                <LottieView
                  source={require('../assets/lottie/new-idea.lottie')}
                  autoPlay
                  loop
                  style={styles.guestLottie}
                />
                <View style={styles.guestBannerText}>
                  <Text style={styles.guestTitle}>Playing as guest</Text>
                  <Text style={styles.guestBody}>
                    Create a free account to challenge friends and save scores →
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Transition overlay renders outside scroll — see bottom of component */}

        {/* ═══ STATE A: Never played (0 games) — single CTA ═══ */}
        {isStateA && (
          <>
            <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.stateAContainer}>
              <LottieView
                source={require('../assets/lottie/new-idea.lottie')}
                autoPlay
                loop
                style={styles.stateALottie}
              />
              <Text style={styles.stateATitle}>Ready to test your knowledge?</Text>
              <Text style={styles.stateAHint}>Quick thinking = bigger scores!</Text>
              <TouchableOpacity onPress={handleSolo} activeOpacity={0.8} style={{ width: '100%' }}>
                <LinearGradient
                  colors={['#22C55E', '#16A34A']}
                  style={styles.stateACta}
                >
                  <Text style={styles.stateACtaText}>▶ Play Your First Game</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.moreWaysContainer}>
              <Text style={styles.moreWaysTitle}>🎮 More Ways to Play</Text>
              <View style={styles.moreWaysRow}>
                <TouchableOpacity style={styles.moreWaysBtn} onPress={() => setJoinModalVisible(true)} activeOpacity={0.7}>
                  <Text style={styles.moreWaysIcon}>🚪</Text>
                  <Text style={styles.moreWaysBtnLabel}>Join Room</Text>
                  <Text style={styles.moreWaysBtnDesc}>Enter a code</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.moreWaysBtn} onPress={handleGroupPlay} activeOpacity={0.7}>
                  <Text style={styles.moreWaysIcon}>👥</Text>
                  <Text style={styles.moreWaysBtnLabel}>Create Room</Text>
                  <Text style={styles.moreWaysBtnDesc}>Play with friends</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </>
        )}

        {/* ═══ STATE B: Has played (1+ games, still new user) ═══ */}
        {isStateB && (
          <HeroSection
            onExploreChallenges={() => (navigation as any).navigate('OpenChallenges')}
            delay={100}
          />
        )}

        {/* ═══ STANDARD: Metrics row (not new user) ═══ */}
        {!isNewUser && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.metricsRow}>
            <MetricsPill icon="🔥" label="Streak" value={metrics.streak} color="#F97316" />
            <MetricsPill icon="🏆" label="Wins" value={metrics.wins} color={colors.brand.primary} />
            <MetricsPill icon="📊" label="Win %" value={metrics.winRate} suffix="%" color={colors.brand.secondary} />
          </Animated.View>
        )}

        {/* ═══ GAME MODES (2×2 Grid) — State B + Standard ═══ */}
        {!isStateA && (
          <Animated.View entering={FadeInDown.delay(isStateB ? 350 : 250).duration(400)} style={styles.modeSection}>
            <Text style={styles.sectionLabel}>GAME MODES</Text>
            <View style={styles.modeGrid}>
              <View style={styles.modeGridRow}>
                <ModeCard
                  icon="🎯"
                  label="Solo"
                  color="#0F5A9F"
                  gem={{ base: '#0F5A9F', light: '#1E90FF', dark: '#0A3A6B' }}
                  onPress={handleSolo}
                  subtitle={isStateB ? 'New category' : 'Play now'}
                />
                <ModeCard
                  icon="⚔️"
                  label={isNewUser ? 'Play & Challenge' : 'Challenge'}
                  color="#B8571A"
                  gem={{ base: '#B8571A', light: '#EA8C35', dark: '#7A3A0F' }}
                  badgeCount={isNewUser ? 0 : pendingCount}
                  onPress={handleChallenge}
                  subtitle={isNewUser ? 'Play now, dare others' : 'vs your friends'}
                  disabled={isGuest}
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
        )}

        {/* ═══ QUICK PLAY (State B only) ═══ */}
        {isStateB && lastPlayedCategory && (
          <QuickPlayBar
            category={lastPlayedCategory}
            onPress={async () => {
              try {
                const qc = lastPlayedQuestionCount;
                const r = await api.post<{ gameId: string; questionSetId: string }>(
                  '/games/solo', { category: lastPlayedCategory, questionCount: qc }
                );
                navigation.navigate('Game', {
                  gameId: r.gameId, mode: 'solo', questionSetId: r.questionSetId,
                  category: lastPlayedCategory!, timer: 30, questionCount: qc,
                });
              } catch {}
            }}
            delay={400}
          />
        )}

        {/* ═══ PROGRESS SECTION (State B only) ═══ */}
        {isStateB && (
          <ProgressSection
            dailyStreak={dailyStreak}
            bestScore={bestScore}
            gamesPlayed={gamesPlayedTotal ?? 0}
            delay={500}
          />
        )}

        {/* ═══ FRIEND REQUESTS ═══ */}
        {!isGuest && friendRequests.length > 0 && (
          <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.challengeSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>👋</Text>
              <Text style={styles.sectionLabel}>FRIEND REQUESTS</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{friendRequests.length}</Text>
              </View>
            </View>
            <View style={styles.challengeList}>
              {friendRequests.map((req) => {
                const avatar = getAvatar(req.avatar_id);
                const isResponding = respondingIds.has(req.id);
                return (
                  <View key={req.id} style={styles.friendRequestRow}>
                    <View style={styles.friendRequestAvatar}>
                      {avatar ? (
                        <Image source={avatar.image} style={styles.friendRequestAvatarImg} resizeMode="cover" />
                      ) : (
                        <Text style={styles.friendRequestInitial}>{req.username[0]?.toUpperCase()}</Text>
                      )}
                    </View>
                    <Text style={styles.friendRequestName} numberOfLines={1}>{req.username}</Text>
                    {isResponding ? (
                      <ActivityIndicator color={colors.brand.primary} size="small" />
                    ) : (
                      <View style={styles.friendRequestActions}>
                        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptRequest(req)} activeOpacity={0.7}>
                          <Text style={styles.acceptBtnText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectRequest(req)} activeOpacity={0.7}>
                          <Text style={styles.rejectBtnText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ═══ INCOMING CHALLENGES ═══ */}
        {!isGuest && incomingChallenges.length > 0 && (
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
        {!isGuest && waitingChallenges.length > 0 && (
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
        {!isGuest && completedChallenges.length > 0 && (
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
                  onPress={() => {
                    const isSeen = item.seen;
                    const result: 'win' | 'loss' | 'tie' = item.won
                      ? 'win'
                      : item.tied
                        ? 'tie'
                        : 'loss';
                    // Navigate first — mark seen after to avoid flash of win/loss color on the pill
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
                    if (!isSeen) markChallengeSeen(item.id);
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

        {/* Empty state: no challenges at all (standard users only) */}
        {!challengesLoading && !hasAnyChallenges && !isGuest && !isNewUser && (
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

      {/* Transition overlay: State A → B/C celebration */}
      <TransitionOverlay
        visible={showTransitionOverlay}
        onDismiss={() => setShowTransitionOverlay(false)}
      />

      {/* Challenge half-sheet for standard users */}
      <ChallengeHalfSheet
        visible={challengeSheetVisible}
        onDuelFriend={() => {
          setChallengeSheetVisible(false);
          navigation.navigate('Friends');
        }}
        onCreateChallenge={() => {
          setChallengeSheetVisible(false);
          navigation.navigate('Category', { mode: 'solo', createChallenge: true } as any);
        }}
        onClose={() => setChallengeSheetVisible(false)}
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
    gap: 20,
  },

  // Lottie mascot sizes
  stateALottie: {
    width: 120,
    height: 120,
  },
  guestLottie: {
    width: 60,
    height: 60,
  },
  guestBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestBannerText: {
    flex: 1,
  },

  // State A: Never played (0 games) — vertically centered as one unit
  stateAContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 4,
    gap: 10,
  },
  stateATitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  stateAHint: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  stateACta: {
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#16A34A',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  stateACtaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  moreWaysContainer: {
    backgroundColor: 'rgba(124,92,255,0.06)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.12)',
  },
  moreWaysTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.secondary,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  moreWaysRow: {
    flexDirection: 'row',
    gap: 12,
  },
  moreWaysBtn: {
    flex: 1,
    backgroundColor: 'rgba(124,92,255,0.08)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.12)',
  },
  moreWaysIcon: { fontSize: 24, marginBottom: 6 },
  moreWaysBtnLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  moreWaysBtnDesc: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 3,
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

  // Friend requests
  friendRequestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  friendRequestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  friendRequestAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  friendRequestInitial: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  friendRequestName: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  friendRequestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  rejectBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  rejectBtnText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
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
