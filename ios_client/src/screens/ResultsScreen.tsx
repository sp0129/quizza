import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
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
import { useDashboardStore } from '../stores/dashboard';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

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
  } = route.params;

  const insets = useSafeAreaInsets();
  const theme = getCategoryTheme(category);
  const removeChallenge = useDashboardStore((s) => s.removeChallenge);

  const [stage, setStage] = useState<Stage>('anticipation');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Check reduce motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  // Animations
  const anticipationOpacity = useSharedValue(0);
  const anticipationScale = useSharedValue(1);
  const myScoreSlide = useSharedValue(40);
  const myScoreOpacity = useSharedValue(0);
  const oppScoreSlide = useSharedValue(40);
  const oppScoreOpacity = useSharedValue(0);
  const metaOpacity = useSharedValue(0);
  const outcomeScale = useSharedValue(0.8);
  const outcomeOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const trophySpin = useSharedValue(0);
  const trophyScale = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);

  // Outcome colors
  const outcomeColor =
    result === 'win' ? '#22C55E' : result === 'loss' ? '#EF4444' : '#F59E0B';

  const outcomeText =
    result === 'win'
      ? 'YOU WON!'
      : result === 'loss'
        ? 'Better luck next time!'
        : "It's a tie!";

  const outcomeEmoji = result === 'win' ? '🏆' : result === 'loss' ? '😢' : '🤝';

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

      setTimeout(() => setStage('complete'), 500);
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
    });
  }, [challengeId, opponentUsername, opponentHandle, navigation, removeChallenge]);

  const handleBackToHome = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (challengeId) removeChallenge(challengeId);
    navigation.navigate('Dashboard');
  }, [challengeId, navigation, removeChallenge]);

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
        {/* ═══ STAGE 1: ANTICIPATION ═══ */}
        {stage === 'anticipation' && (
          <Animated.View style={[styles.anticipationContainer, anticipationStyle]}>
            <Text style={styles.anticipationIcon}>🏆</Text>
            <Text style={styles.anticipationText}>Calculating results...</Text>
          </Animated.View>
        )}

        {/* ═══ STAGE 2+: SCORES ═══ */}
        {stage !== 'anticipation' && (
          <View style={styles.scoresContainer}>
            {/* Versus row: You | vs | Opponent */}
            <View style={styles.vsRow}>
              {/* Your score */}
              <Animated.View style={[styles.vsBlock, myScoreStyle]}>
                <Text style={styles.vsLabel}>You</Text>
                <CountingNumber
                  target={yourScore}
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
            {result === 'win' && (
              <Animated.Text style={[styles.trophyEmoji, trophyStyle]}>
                🏆
              </Animated.Text>
            )}
            <Text style={[styles.outcomeText, { color: outcomeColor }]}>
              {outcomeText}
            </Text>
            {result !== 'win' && (
              <Text style={styles.outcomeEmoji}>{outcomeEmoji}</Text>
            )}
          </Animated.View>
        )}

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* ═══ ACTION BUTTONS ═══ */}
        {(stage === 'outcome' || stage === 'complete') && (
          <Animated.View style={[styles.buttonsContainer, buttonsStyle]}>
            {hasOpponent && gameMode === 'challenge' && (
              <TouchableOpacity
                style={styles.rematchBtn}
                onPress={handleRematch}
                activeOpacity={0.8}
              >
                <Text style={styles.rematchBtnText}>Rematch</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.homeBtn}
              onPress={handleBackToHome}
              activeOpacity={0.8}
            >
              <Text style={styles.homeBtnText}>Back to Home</Text>
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
    justifyContent: 'center',
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
  outcomeEmoji: {
    fontSize: 40,
  },
  trophyEmoji: {
    fontSize: 40,
  },

  // Spacer
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
