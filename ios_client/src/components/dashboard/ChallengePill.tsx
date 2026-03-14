import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { getCategoryTheme } from '../../utils/categoryThemes';

interface ChallengePillProps {
  challengeId: string;
  opponentUsername: string;
  category: string;
  type: 'incoming' | 'outgoing';
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
  const theme = getCategoryTheme(category);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const tapGesture = Gesture.Tap()
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

  const isOutgoing = type === 'outgoing';

  // Outcome-based styling for completed challenges
  const outcomeColor = isOutgoing
    ? won
      ? '#22C55E'
      : tied
        ? '#F59E0B'
        : '#EF4444'
    : colors.bg.elevated;

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

  // Glow shadow for completed cards
  const glowShadow = isOutgoing
    ? {
        shadowColor: outcomeColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
      }
    : {};

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[
          styles.pill,
          { borderColor: outcomeColor },
          glowShadow,
          animStyle,
        ]}
        exiting={FadeOut.duration(200).withInitialValues({ opacity: 1 })}
      >
        {/* Category icon */}
        <Text style={styles.categoryIcon}>{theme.emoji}</Text>

        {/* Opponent handle */}
        <Text style={styles.handle} numberOfLines={1}>
          @{opponentUsername}
        </Text>

        {/* Outcome text or time */}
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
      </Animated.View>
    </GestureDetector>
  );
}

export default React.memo(ChallengePill);

const styles = StyleSheet.create({
  pill: {
    width: 150,
    height: 150,
    backgroundColor: colors.bg.surface,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  categoryIcon: {
    fontSize: 40,
  },
  handle: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 126,
  },
  outcomeText: {
    fontSize: 16,
    fontWeight: '800',
  },
  outcomeEmoji: {
    fontSize: 28,
  },
  time: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '400',
  },
});
