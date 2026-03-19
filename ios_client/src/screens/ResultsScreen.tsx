import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  FadeIn,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, gradients } from '../theme/colors';
import { getCategoryTheme } from '../utils/categoryThemes';
import ConfettiOverlay from '../components/ConfettiOverlay';
import PizzaMascot from '../components/PizzaMascot';
import { playSound } from '../utils/sounds';
import { useDashboardStore } from '../stores/dashboard';
import { api } from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

// ---------------------------------------------------------------------------
// Result messaging based on correctness percentage (from challenges_spec.md)
// ---------------------------------------------------------------------------

function getResultMessage(correctCount: number, totalQuestions: number): { message: string; emoji: string } {
  const pct = (correctCount / totalQuestions) * 100;
  if (pct === 100) return { message: 'Perfect!', emoji: '\uD83C\uDFAF' };
  if (pct >= 80)  return { message: 'Outstanding!', emoji: '\uD83C\uDF1F' };
  if (pct >= 60)  return { message: 'Great job!', emoji: '\uD83D\uDC4F' };
  if (pct >= 40)  return { message: 'Well played!', emoji: '\uD83D\uDC4D' };
  if (pct >= 20)  return { message: 'Not bad!', emoji: '\uD83D\uDCAA' };
  if (pct > 0)    return { message: `Getting there! You learned ${totalQuestions} new things.`, emoji: '\uD83D\uDE80' };
  return { message: `New to this? You just learned ${totalQuestions} things!`, emoji: '\uD83C\uDF31' };
}

type Stage = 'anticipation' | 'scores' | 'outcome' | 'complete';

// ---------------------------------------------------------------------------
// Counting number display
// ---------------------------------------------------------------------------

function CountingNumber({
  target,
  duration = 500,
  delay = 0,
  style: textStyle,
}: {
  target: number;
  duration?: number;
  delay?: number;
  style?: any;
}) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      started.current = true;
      const steps = 20;
      const stepTime = duration / steps;
      let step = 0;
      const interval = setInterval(() => {
        step++;
        // Ease-out cubic
        const t = step / steps;
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(target * eased));
        if (step >= steps) {
          clearInterval(interval);
          setDisplay(target);
        }
      }, stepTime);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(startTimeout);
  }, [target, duration, delay]);

  return <Text style={textStyle}>{display}</Text>;
}

// ---------------------------------------------------------------------------
// Main ResultsScreen
// ---------------------------------------------------------------------------

export default function ResultsScreen({ route, navigation }: Props) {
  const {
    yourScore,
    opponentScore,
    opponentHandle,
    category,
    gameMode,
    timestamp,
    result,
    challengeId,
    opponentUsername,
    skipAnimation,
    questionSetId,
    correctCount,
    totalQuestions,
    totalTimeTaken,
    openChallengeId,
    createChallenge,
    questionCount: lastQuestionCount,
    timer: lastTimer,
  } = route.params;

  const insets = useSafeAreaInsets();
  const theme = getCategoryTheme(category);
  const removeChallenge = useDashboardStore((s) => s.removeChallenge);

  const skip = !!skipAnimation;
  const [stage, setStage] = useState<Stage>(skip ? 'complete' : 'anticipation');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Open Challenge posting state
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  // Open Challenge submission state (when playing someone else's challenge)
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [challengeRank, setChallengeRank] = useState<number | null>(null);

  // Solo result messaging
  const isPerfect = correctCount != null && totalQuestions != null && correctCount === totalQuestions;
  const perfectBonus = isPerfect ? (totalQuestions >= 10 ? 100 : 50) : 0;

  // Perfect bonus animation state
  const [showPerfectBonus, setShowPerfectBonus] = useState(false);
  // Display base score first, then tick up when bonus appears
  const baseScore = isPerfect ? yourScore - perfectBonus : yourScore;
  const [displayScore, setDisplayScore] = useState(baseScore);
  const correctPct = (correctCount != null && totalQuestions != null && totalQuestions > 0) ? (correctCount / totalQuestions) * 100 : 0;
  const canPostChallenge = gameMode === 'solo' && !openChallengeId && !!questionSetId && correctCount != null && totalQuestions != null && correctPct >= 60;
  const resultMsg = (correctCount != null && totalQuestions != null)
    ? getResultMessage(correctCount, totalQuestions)
    : null;

  // Perfect nudge copy variants (solo + perfect only)
  const perfectNudgeCopy = (() => {
    if (!isPerfect || gameMode !== 'solo' || openChallengeId) return null;
    const n = totalQuestions ?? 10;
    const variants = [
      'Perfect score. Think anyone can beat that? 😈',
      `${n} for ${n}. Let the world try 🏟️`,
      'That was too easy for you. Share it! 🔥',
      'Dare someone to match this 👀',
      'Flex worthy. Post it! 💪',
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  })();

  // Auto-submit to open challenge when playing someone else's challenge
  useEffect(() => {
    if (!openChallengeId || correctCount == null || totalQuestions == null || totalTimeTaken == null || submitted || submitting) return;
    setSubmitting(true);
    api.post<{ rank: number }>(`/open-challenges/${openChallengeId}/submit`, {
      correct_count: correctCount,
      total_questions: totalQuestions,
      total_score: yourScore,
      time_seconds: totalTimeTaken,
    }).then(res => {
      setChallengeRank(res.rank);
      setSubmitted(true);
    }).catch(() => {
      // Silently fail — user can still see their score
    }).finally(() => setSubmitting(false));
  }, [openChallengeId, correctCount, totalQuestions, totalTimeTaken, yourScore]);

  // Check reduce motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  // Animations — initialize to final state if skipping
  const anticipationOpacity = useSharedValue(skip ? 0 : 0);
  const anticipationScale = useSharedValue(1);
  const myScoreSlide = useSharedValue(skip ? 0 : 40);
  const myScoreOpacity = useSharedValue(skip ? 1 : 0);
  const oppScoreSlide = useSharedValue(skip ? 0 : 40);
  const oppScoreOpacity = useSharedValue(skip ? 1 : 0);
  const metaOpacity = useSharedValue(skip ? 1 : 0);
  const outcomeScale = useSharedValue(skip ? 1 : 0.8);
  const outcomeOpacity = useSharedValue(skip ? 1 : 0);
  const shakeX = useSharedValue(0);
  const trophySpin = useSharedValue(0);
  const trophyScale = useSharedValue(skip ? 1 : 0);
  const buttonsOpacity = useSharedValue(skip ? 1 : 0);

  // Outcome colors
  const outcomeColor =
    gameMode === 'solo' ? '#22C55E'
    : result === 'win' ? '#22C55E' : result === 'loss' ? '#EF4444' : '#F59E0B';

  const outcomeText =
    gameMode === 'solo' && resultMsg
      ? `${resultMsg.message} ${resultMsg.emoji}`
      : gameMode === 'solo'
        ? 'Well played!'
        : result === 'win'
          ? 'YOU WON!'
          : result === 'loss'
            ? 'Better luck next time!'
            : "It's a tie!";


  // ---------------------------------------------------------------------------
  // Staged reveal timeline
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (reduceMotion || skipAnimation) {
      // Skip animations, show everything immediately
      anticipationOpacity.value = 0;
      myScoreOpacity.value = 1;
      myScoreSlide.value = 0;
      oppScoreOpacity.value = 1;
      oppScoreSlide.value = 0;
      metaOpacity.value = 1;
      outcomeOpacity.value = 1;
      outcomeScale.value = 1;
      buttonsOpacity.value = 1;
      trophyScale.value = 1;
      trophySpin.value = 0;
      setStage('complete');
      return;
    }

    // Stage 1: Anticipation (0 - 3s)
    anticipationOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    anticipationScale.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        3,
        true,
      ),
    );

    // Stage 2: Score reveal (3s)
    const scoreRevealTimeout = setTimeout(() => {
      setStage('scores');
      anticipationOpacity.value = withTiming(0, { duration: 300 });

      // Your score slides in
      myScoreSlide.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      myScoreOpacity.value = withTiming(1, { duration: 300 });

      // Opponent score slides in (delayed)
      oppScoreSlide.value = withDelay(
        800,
        withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }),
      );
      oppScoreOpacity.value = withDelay(800, withTiming(1, { duration: 300 }));

      // Category + timestamp fade in
      metaOpacity.value = withDelay(1300, withTiming(1, { duration: 200 }));
    }, 3000);

    // Stage 3: Outcome declaration (5s)
    const outcomeTimeout = setTimeout(() => {
      setStage('outcome');

      if (result === 'win') {
        outcomeScale.value = withSpring(1, {
          mass: 0.8,
          damping: 10,
          stiffness: 200,
        });
        outcomeOpacity.value = withTiming(1, { duration: 200 });
        trophyScale.value = withDelay(
          200,
          withSpring(1, { mass: 0.8, damping: 8, stiffness: 180 }),
        );
        trophySpin.value = withDelay(
          200,
          withTiming(360, { duration: 600, easing: Easing.out(Easing.cubic) }),
        );
        setShowConfetti(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playSound('celebrate');
      } else if (result === 'loss') {
        outcomeOpacity.value = withTiming(1, { duration: 200 });
        outcomeScale.value = withTiming(1, { duration: 200 });
        shakeX.value = withSequence(
          withTiming(8, { duration: 60 }),
          withTiming(-8, { duration: 60 }),
          withTiming(6, { duration: 60 }),
          withTiming(-6, { duration: 60 }),
          withTiming(3, { duration: 60 }),
          withTiming(0, { duration: 60 }),
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        outcomeScale.value = withSpring(1, {
          mass: 0.8,
          damping: 10,
          stiffness: 200,
        });
        outcomeOpacity.value = withTiming(1, { duration: 200 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Buttons appear after outcome
      buttonsOpacity.value = withDelay(
        500,
        withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
      );

      setTimeout(() => {
        setStage('complete');
        // Trigger perfect bonus animation after a beat
        if (isPerfect && perfectBonus > 0) {
          setTimeout(() => {
            setShowPerfectBonus(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Tick score up to include bonus after banner appears
            setTimeout(() => setDisplayScore(yourScore), 400);
          }, 500);
        }
      }, 500);
    }, 5000);

    return () => {
      clearTimeout(scoreRevealTimeout);
      clearTimeout(outcomeTimeout);
    };
  }, [reduceMotion, result]);

  // ---------------------------------------------------------------------------
  // Animated styles
  // ---------------------------------------------------------------------------

  const anticipationStyle = useAnimatedStyle(() => ({
    opacity: anticipationOpacity.value,
    transform: [{ scale: anticipationScale.value }],
  }));

  const myScoreStyle = useAnimatedStyle(() => ({
    opacity: myScoreOpacity.value,
    transform: [{ translateY: myScoreSlide.value }],
  }));

  const oppScoreStyle = useAnimatedStyle(() => ({
    opacity: oppScoreOpacity.value,
    transform: [{ translateY: oppScoreSlide.value }],
  }));

  const metaStyle = useAnimatedStyle(() => ({
    opacity: metaOpacity.value,
  }));

  const outcomeStyle = useAnimatedStyle(() => ({
    opacity: outcomeOpacity.value,
    transform: [
      { scale: outcomeScale.value },
      { translateX: shakeX.value },
    ],
  }));

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: trophyScale.value },
      { rotate: `${trophySpin.value}deg` },
    ],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleRematch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (challengeId) removeChallenge(challengeId);
    navigation.navigate('Category', {
      mode: 'challenge',
      target: opponentUsername ?? opponentHandle?.replace('@', ''),
      preselectedCategory: category,
    });
  }, [challengeId, opponentUsername, opponentHandle, navigation, removeChallenge]);

  const [playAgainLoading, setPlayAgainLoading] = useState(false);

  const handlePlayAgain = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPlayAgainLoading(true);
    try {
      const r = await api.post<{ gameId: string; questionSetId: string }>(
        '/games/solo', { category, questionCount: lastQuestionCount ?? 10 }
      );
      navigation.replace('Game', {
        gameId: r.gameId, mode: 'solo', questionSetId: r.questionSetId,
        category, timer: lastTimer ?? 30, questionCount: lastQuestionCount ?? 10,
      });
    } catch {
      // Fallback to category picker if API fails
      navigation.navigate('Category', { mode: 'solo', preselectedCategory: category });
    } finally {
      setPlayAgainLoading(false);
    }
  }, [navigation, category, lastQuestionCount, lastTimer]);

  const handleBackToHome = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('MainTabs');
  }, [navigation]);

  const handlePostChallenge = useCallback(async () => {
    if (!questionSetId || correctCount == null || totalQuestions == null || totalTimeTaken == null) return;
    setPosting(true);
    try {
      await api.post('/open-challenges', {
        question_set_id: questionSetId,
        category,
        mode: totalQuestions === 5 ? '5Q' : '10Q',
        correct_count: correctCount,
        total_score: yourScore,
        time_seconds: totalTimeTaken,
      });
      setPosted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPosting(false);
    }
  }, [questionSetId, category, correctCount, totalQuestions, totalTimeTaken, yourScore]);

  // ---------------------------------------------------------------------------
  // Time formatting
  // ---------------------------------------------------------------------------

  const timeLabel = (() => {
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  })();

  const hasOpponent = opponentScore !== undefined && opponentScore !== null;
  const skipCountDelay = reduceMotion || skipAnimation;

  return (
    <LinearGradient colors={gradients.game} style={styles.flex}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* Top spacer — push content to ~30% from top */}
        <View style={styles.topSpacer} />

        {/* ═══ STAGE 1: ANTICIPATION ═══ */}
        {stage === 'anticipation' && (
          <Animated.View style={[styles.anticipationContainer, anticipationStyle]}>
            <PizzaMascot mood="thinking" size={90} />
            <Text style={styles.anticipationText}>Calculating results...</Text>
          </Animated.View>
        )}

        {/* ═══ STAGE 2+: SCORES ═══ */}
        {stage !== 'anticipation' && (
          <View style={styles.scoresContainer}>
            {/* Versus row: You | vs | Opponent */}
            <View style={styles.vsRow}>
              {/* Your score — category-colored glow */}
              <Animated.View style={[styles.vsBlock, myScoreStyle, {
                shadowColor: theme.accent,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 8,
              }]}>
                <Text style={styles.vsLabel}>You</Text>
                <CountingNumber
                  target={displayScore}
                  duration={skipCountDelay ? 0 : 500}
                  delay={skipCountDelay ? 0 : 100}
                  style={styles.vsScore}
                />
              </Animated.View>

              {/* VS divider */}
              {hasOpponent && (
                <Animated.View style={[styles.vsDivider, metaStyle]}>
                  <Text style={styles.vsText}>vs</Text>
                </Animated.View>
              )}

              {/* Opponent score */}
              {hasOpponent && (
                <Animated.View style={[styles.vsBlock, oppScoreStyle]}>
                  <Text style={styles.vsLabel} numberOfLines={1}>
                    {opponentHandle ?? 'Opponent'}
                  </Text>
                  <CountingNumber
                    target={opponentScore!}
                    duration={skipCountDelay ? 0 : 500}
                    delay={skipCountDelay ? 0 : 900}
                    style={styles.vsScore}
                  />
                </Animated.View>
              )}
            </View>

            {/* Meta info */}
            <Animated.View style={[styles.metaRow, metaStyle]}>
              <Text style={styles.metaText}>
                {theme.emoji} {category}
              </Text>
              {timeLabel ? (
                <Text style={styles.metaText}>{timeLabel}</Text>
              ) : null}
            </Animated.View>
          </View>
        )}

        {/* ═══ STAGE 3: OUTCOME ═══ */}
        {(stage === 'outcome' || stage === 'complete') && (
          <Animated.View style={[styles.outcomeContainer, outcomeStyle]}>
            <PizzaMascot
              mood={gameMode === 'solo' ? 'happy' : result === 'win' ? 'celebrating' : result === 'loss' ? 'wrong' : 'happy'}
              size={110}
            />
            <Text style={[styles.outcomeText, { color: outcomeColor }]}>
              {outcomeText}
            </Text>
          </Animated.View>
        )}

        {/* ═══ CHALLENGE RANK (open challenge results) ═══ */}
        {(stage === 'outcome' || stage === 'complete') && openChallengeId && submitted && challengeRank != null && (
          <Animated.View style={[styles.rankBanner, buttonsStyle]}>
            <Text style={styles.rankBannerText}>You ranked #{challengeRank}</Text>
          </Animated.View>
        )}

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* ═══ PERFECT BONUS BANNER ═══ */}
        {(stage === 'outcome' || stage === 'complete') && showPerfectBonus && perfectBonus > 0 && (
          <Animated.View style={[styles.perfectBanner, buttonsStyle]}>
            <Text style={styles.perfectBannerText}>
              {(() => {
                const variants = [
                  'Perfect round! 🎯', 'Flawless victory! 💎', 'Nothing but net! 🏀',
                  'Clean sweep! 🧹', 'Nailed it! 🔨', 'Big brain energy! 🧠',
                  'Are you cheating?! 👀', 'Okay, show-off 😏', 'Absolute legend 👑',
                  'You made that look easy ✨',
                ];
                return variants[Math.floor(Math.random() * variants.length)];
              })()}
            </Text>
            <Text style={styles.perfectBonusText}>+{perfectBonus} bonus</Text>
          </Animated.View>
        )}

        {/* ═══ PERFECT NUDGE COPY (solo only) ═══ */}
        {(stage === 'outcome' || stage === 'complete') && perfectNudgeCopy && !posted && (
          <Animated.View style={[styles.perfectNudge, buttonsStyle]}>
            <Text style={styles.perfectNudgeText}>{perfectNudgeCopy}</Text>
          </Animated.View>
        )}

        {/* ═══ ACTION BUTTONS ═══ */}
        {(stage === 'outcome' || stage === 'complete') && (
          <Animated.View style={[styles.buttonsContainer, buttonsStyle]}>
            {/* PRIMARY: Play Again (all modes) — same category, questions, timer */}
            <TouchableOpacity onPress={handlePlayAgain} activeOpacity={0.8} disabled={playAgainLoading}>
              <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.playAgainBtn}>
                {playAgainLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.playAgainBtnText}>▶ Play {category} Again</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Rematch (duel mode) */}
            {hasOpponent && gameMode === 'challenge' && (
              <TouchableOpacity
                style={styles.rematchBtn}
                onPress={handleRematch}
                activeOpacity={0.8}
              >
                <Text style={styles.rematchBtnText}>Rematch</Text>
              </TouchableOpacity>
            )}

            {/* Create Challenge flow: "Post Challenge" is the expected primary action */}
            {createChallenge && !openChallengeId && canPostChallenge && (
              <>
                <Text style={styles.createChallengeLabel}>
                  {posted ? '' : 'Your challenge is ready! Post it?'}
                </Text>
                <TouchableOpacity
                  style={[styles.postChallengeBtn, posted && styles.postChallengeBtnDone]}
                  onPress={handlePostChallenge}
                  activeOpacity={0.8}
                  disabled={posting || posted}
                >
                  {posting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.postChallengeBtnText}>
                      {posted ? 'Challenge Posted!' : 'Post Challenge'}
                    </Text>
                  )}
                </TouchableOpacity>
                {!posted && !posting && (
                  <TouchableOpacity onPress={handleBackToHome} activeOpacity={0.7}>
                    <Text style={styles.notNowText}>Not Now</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Solo (not create challenge flow): earned Post as Challenge — ≥60% → plain, <60% → hidden */}
            {!createChallenge && canPostChallenge && (
              <TouchableOpacity
                style={[styles.postChallengeBtn, posted && styles.postChallengeBtnDone]}
                onPress={handlePostChallenge}
                activeOpacity={0.8}
                disabled={posting || posted}
              >
                {posting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.postChallengeBtnText}>
                    {posted ? 'Challenge Posted!' : 'Post as Challenge'}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* View Leaderboard (open challenge results) */}
            {openChallengeId && submitted && (
              <TouchableOpacity
                style={styles.viewLeaderboardBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('ChallengeDetail', { challengeId: openChallengeId });
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.viewLeaderboardBtnText}>View Leaderboard</Text>
              </TouchableOpacity>
            )}

            {/* Home */}
            <TouchableOpacity
              style={styles.homeBtn}
              onPress={handleBackToHome}
              activeOpacity={0.8}
            >
              <Text style={styles.homeBtnText}>Home</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* ═══ CONFETTI (win only) ═══ */}
      {showConfetti && result === 'win' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ConfettiOverlay />
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
  },

  // Anticipation
  anticipationContainer: {
    alignItems: 'center',
    gap: 16,
  },
  anticipationIcon: {
    fontSize: 80,
    opacity: 0.3,
  },
  anticipationText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },

  // Scores — versus layout
  scoresContainer: {
    alignItems: 'center',
    gap: 12,
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  vsBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  vsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    maxWidth: 120,
  },
  vsScore: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  vsDivider: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    fontStyle: 'italic',
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  metaText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },

  // Outcome
  outcomeContainer: {
    alignItems: 'center',
    marginTop: 32,
    gap: 8,
  },
  outcomeText: {
    fontSize: 28,
    fontWeight: '800',
  },

  // Spacers
  topSpacer: {
    flex: 0.3,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },

  // Buttons — 3D raised look
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  rematchBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#5B21B6',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  rematchBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Play Again — primary CTA on all results screens
  playAgainBtn: {
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
  playAgainBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  // Perfect bonus
  perfectBanner: {
    backgroundColor: '#F59E0B20',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F59E0B40',
    alignItems: 'center',
  },
  perfectBannerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  perfectBonusText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
    marginTop: 2,
  },

  // Perfect nudge (solo only)
  perfectNudge: {
    marginBottom: 8,
    alignItems: 'center',
  },
  perfectNudgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  rankBanner: {
    backgroundColor: '#7C3AED20',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#7C3AED40',
  },
  rankBannerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
    textAlign: 'center',
  },
  viewLeaderboardBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#5B21B6',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  viewLeaderboardBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  createChallengeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  notNowText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  postChallengeBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 14,
    height: 48,
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
  postChallengeBtnDone: {
    backgroundColor: '#334155',
    borderBottomColor: '#1E293B',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
  },
  postChallengeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  homeBtn: {
    backgroundColor: '#334155',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#1E293B',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  homeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
