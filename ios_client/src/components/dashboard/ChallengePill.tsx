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

  // Tinted background based on outcome
  const tintedBg = isOutgoing ? outcomeColor + '18' : colors.bg.surface;
  const borderCol = isOutgoing ? outcomeColor : colors.bg.elevated;
  // Darker shade for 3D bottom edge
  const bottomEdgeColor = isOutgoing ? outcomeColor + '60' : colors.bg.elevated;

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[
          styles.pillOuter,
          animStyle,
          // Colored glow shadow
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
        {/* 3D bottom edge — thicker colored bar at bottom */}
        <View
          style={[
            styles.bottomEdge,
            { backgroundColor: bottomEdgeColor },
          ]}
        />

        {/* Main card face */}
        <View
          style={[
            styles.pill,
            {
              backgroundColor: tintedBg,
              borderColor: borderCol,
            },
          ]}
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
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export default React.memo(ChallengePill);

const styles = StyleSheet.create({
  pillOuter: {
    width: 150,
    height: 154, // 150 + 4 for bottom edge
    borderRadius: 16,
  },
  bottomEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    borderRadius: 16,
    // Sits behind pill, visible as a 4px bottom bar
  },
  pill: {
    width: 150,
    height: 150,
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
