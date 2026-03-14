import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  FadeOut,
  SlideOutLeft,
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
  myScore,
  opponentScore,
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
  const borderColor = isOutgoing
    ? (won ? '#22C55E' : tied ? '#F59E0B' : '#EF4444')
    : colors.bg.elevated;

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[styles.pill, { borderColor }, animStyle]}
        exiting={FadeOut.duration(200).withInitialValues({ opacity: 1 })}
      >
        {/* Outgoing: result badge */}
        {isOutgoing && (
          <View style={[styles.resultBadge, { backgroundColor: borderColor }]}>
            <Text style={styles.resultBadgeText}>
              {won ? '✓' : tied ? '=' : '✕'}
            </Text>
          </View>
        )}

        {/* Category icon */}
        <Text style={styles.categoryIcon}>{theme.emoji}</Text>

        {/* Opponent handle */}
        <Text style={styles.handle} numberOfLines={1}>
          @{opponentUsername}
        </Text>

        {/* Bottom info: time for incoming, score for outgoing */}
        {isOutgoing && myScore !== undefined ? (
          <Text style={[styles.score, { color: borderColor }]}>
            {myScore}–{opponentScore}
          </Text>
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
    width: 140,
    height: 100,
    backgroundColor: colors.bg.surface,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  resultBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  categoryIcon: {
    fontSize: 32,
  },
  handle: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 120,
  },
  score: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  time: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '400',
  },
});
