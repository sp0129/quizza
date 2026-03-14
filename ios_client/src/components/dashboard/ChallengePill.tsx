import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
  FadeOut,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { getCategoryTheme } from '../../utils/categoryThemes';

interface ChallengePillProps {
  challengeId: string;
  opponentUsername: string;
  category: string;
  type: 'incoming' | 'outgoing' | 'waiting';
  timeSent?: string;
  myScore?: number;
  opponentScore?: number;
  won?: boolean;
  tied?: boolean;
  onPress: () => void;
}

function getTimeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ChallengePill({
  opponentUsername,
  category,
  type,
  timeSent,
  won,
  tied,
  onPress,
}: ChallengePillProps) {
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const theme = getCategoryTheme(category);
  const isWaiting = type === 'waiting';
  const isOutgoing = type === 'outgoing';

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  // Pulsing animation for waiting state
  useEffect(() => {
    if (isWaiting) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
  }, [isWaiting]);

  const tapGesture = Gesture.Tap()
    .enabled(!isWaiting) // Disable tap for waiting cards
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.95, { damping: 12, stiffness: 400 });
    })
    .onFinalize((_e, success) => {
      'worklet';
      scale.value = withSpring(1, { damping: 10, stiffness: 300 });
      if (success) runOnJS(handlePress)();
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // ── Waiting state ──
  if (isWaiting) {
    return (
      <GestureDetector gesture={tapGesture}>
        <Animated.View
          style={[
            styles.pillOuter,
            animStyle,
            {
              shadowColor: '#06B6D4',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 3,
            },
          ]}
          exiting={FadeOut.duration(200).withInitialValues({ opacity: 1 })}
        >
          <View style={[styles.bottomEdge, { backgroundColor: '#06B6D420' }]} />
          <View
            style={[
              styles.pill,
              {
                backgroundColor: '#06B6D40D',
                borderColor: '#06B6D4',
                opacity: 0.85,
              },
            ]}
          >
            <Text style={styles.categoryIcon}>{theme.emoji}</Text>
            <Text style={styles.handle} numberOfLines={1}>
              @{opponentUsername}
            </Text>
            <Text style={styles.waitingText}>Waiting...</Text>
            <Animated.Text style={[styles.waitingIcon, pulseStyle]}>
              ⏳
            </Animated.Text>
          </View>
        </Animated.View>
      </GestureDetector>
    );
  }

  // ── Outcome-based styling for completed challenges ──
  const outcomeColor = isOutgoing
    ? won
      ? '#22C55E'
      : tied
        ? '#F59E0B'
        : '#EF4444'
    : '#94A3B8';

  const outcomeText = isOutgoing
    ? won
      ? 'You won!'
      : tied
        ? 'You tied'
        : 'You lost'
    : undefined;

  const outcomeEmoji = isOutgoing
    ? won
      ? '🎉'
      : tied
        ? '🤝'
        : '😢'
    : undefined;

  const tintedBg = isOutgoing ? outcomeColor + '18' : colors.bg.surface;
  const borderCol = isOutgoing ? outcomeColor : colors.bg.elevated;
  const bottomEdgeColor = isOutgoing ? outcomeColor + '60' : colors.bg.elevated;

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[
          styles.pillOuter,
          animStyle,
          isOutgoing && {
            shadowColor: outcomeColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
          },
        ]}
        exiting={FadeOut.duration(200).withInitialValues({ opacity: 1 })}
      >
        <View
          style={[styles.bottomEdge, { backgroundColor: bottomEdgeColor }]}
        />
        <View
          style={[
            styles.pill,
            { backgroundColor: tintedBg, borderColor: borderCol },
          ]}
        >
          <Text style={styles.categoryIcon}>{theme.emoji}</Text>
          <Text style={styles.handle} numberOfLines={1}>
            @{opponentUsername}
          </Text>
          {isOutgoing && outcomeText ? (
            <>
              <Text style={[styles.outcomeText, { color: outcomeColor }]}>
                {outcomeText}
              </Text>
              <Text style={styles.outcomeEmoji}>{outcomeEmoji}</Text>
            </>
          ) : (
            <Text style={styles.time}>
              {timeSent ? getTimeSince(timeSent) : ''}
            </Text>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export default React.memo(ChallengePill);

const styles = StyleSheet.create({
  pillOuter: {
    width: 125,
    height: 129,
    borderRadius: 16,
  },
  bottomEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    borderRadius: 16,
  },
  pill: {
    width: 125,
    height: 125,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  categoryIcon: {
    fontSize: 36,
  },
  handle: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 105,
  },
  outcomeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  outcomeEmoji: {
    fontSize: 24,
  },
  time: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '400',
  },
  // Waiting state
  waitingText: {
    color: '#06B6D4',
    fontSize: 12,
    fontWeight: '600',
  },
  waitingIcon: {
    fontSize: 20,
  },
});
