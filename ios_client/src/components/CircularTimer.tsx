import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { CountdownCircleTimer } from 'react-native-countdown-circle-timer';
import { colors } from '../theme/colors';

// Circular countdown timer with progressive urgency colors.
// Color gradient follows the timer psychology from uiux.md:
//   blue (safe) → yellow (50%) → orange (25%) → red (critical <10s)
// A "points available" counter ticks down alongside the timer to make
// speed-based scoring tangible — players see their potential reward shrinking.
// In the final 5 seconds, the timer pulses (scale 1.0 → 1.2 → 1.0) to
// create visual urgency.

interface Props {
  duration: number;       // Total seconds (e.g. 30)
  timeLeft: number;       // Current remaining seconds (driven by parent state)
  isPlaying: boolean;     // Pause during answer reveal
  onComplete?: () => void;
  /** Key to force timer reset on new question */
  timerKey: number;
}

// Points scale linearly: 100 at instant answer → 50 at timeout (per scoring.ts)
function calculatePointsAvailable(timeLeft: number, duration: number): number {
  if (timeLeft <= 0) return 50;
  const fraction = timeLeft / duration;
  return Math.round(50 + fraction * 50);
}

function CircularTimer({ duration, timeLeft, isPlaying, onComplete, timerKey }: Props) {
  const pointsAvailable = calculatePointsAvailable(timeLeft, duration);
  const pulseScale = useSharedValue(1);

  // Pulsing animation in final 5 seconds
  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0 && isPlaying) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 150, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 150, easing: Easing.in(Easing.ease) }),
        ),
        -1, // infinite repeat
        false,
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = 1;
    }
  }, [timeLeft <= 5 && timeLeft > 0 && isPlaying]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Color thresholds matching the progressive urgency system:
  // 100%-50%: safe blue | 50%-25%: warning yellow | 25%-10s: danger orange | <10s: critical red
  return (
    <View style={styles.container}>
      <Animated.View style={pulseStyle}>
        <CountdownCircleTimer
          key={timerKey}
          isPlaying={isPlaying}
          duration={duration}
          colors={[
            '#3B82F6' as const,  // safe blue
            '#F59E0B' as const,  // warning yellow
            '#F97316' as const,  // danger orange
            '#EF4444' as const,  // critical red
          ]}
          colorsTime={[
            duration,
            Math.round(duration * 0.5),
            Math.round(duration * 0.25),
            0,
          ]}
          size={64}
          strokeWidth={5}
          trailColor={'#334155' as `#${string}`}
          onComplete={onComplete}
        >
          {({ remainingTime }) => (
            <View style={styles.inner}>
              <Text style={[
                styles.seconds,
                remainingTime <= 10 && styles.secondsCritical,
                remainingTime <= 5 && styles.secondsPulsing,
              ]}>
                {remainingTime}
              </Text>
            </View>
          )}
        </CountdownCircleTimer>
      </Animated.View>
      {/* Points available counter — makes speed-scoring tangible */}
      <Text style={styles.pointsLabel}>
        +{pointsAvailable}
      </Text>
    </View>
  );
}

export default React.memo(CircularTimer);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 2,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  seconds: {
    // Monospace prevents layout shift during countdown
    fontVariant: ['tabular-nums'],
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  secondsCritical: {
    color: colors.timer.critical,
  },
  secondsPulsing: {
    fontWeight: '900',
  },
  pointsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gold,
    fontVariant: ['tabular-nums'],
  },
});
