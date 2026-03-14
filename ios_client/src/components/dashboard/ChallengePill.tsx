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
  const pulseOpacity = useSharedValue(1);
  const theme = getCategoryTheme(category);
  const isWaiting = type === 'waiting';
  const isOutgoing = type === 'outgoing';

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  // Pulsing for waiting state
  useEffect(() => {
    if (isWaiting) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
  }, [isWaiting]);

  const tapGesture = Gesture.Tap()
    .enabled(!isWaiting)
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.98, { damping: 12, stiffness: 400 });
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
    opacity: pulseOpacity.value,
  }));

  // Colors based on type
  let accentColor = '#06B6D4'; // Incoming: cyan
  let statusText = timeSent ? getTimeSince(timeSent) : '';
  let statusEmoji = '';
  let rowOpacity = 1;

  if (isWaiting) {
    accentColor = '#B8571A'; // Outgoing: orange
    statusText = 'Waiting for opponent...';
    statusEmoji = '⏳';
    rowOpacity = 0.75;
  } else if (isOutgoing) {
    if (won) {
      accentColor = '#22C55E';
      statusText = 'You won!';
      statusEmoji = '🎉';
    } else if (tied) {
      accentColor = '#F59E0B';
      statusText = 'You tied';
      statusEmoji = '🤝';
    } else {
      accentColor = '#EF4444';
      statusText = 'You lost';
      statusEmoji = '😢';
    }
  }

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[
          styles.row,
          {
            opacity: rowOpacity,
            shadowColor: accentColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
          },
          animStyle,
        ]}
        exiting={FadeOut.duration(200).withInitialValues({ opacity: 1 })}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        {/* Category emoji */}
        <Text style={styles.emoji}>{theme.emoji}</Text>

        {/* Text content */}
        <View style={styles.textCol}>
          <Text style={styles.username} numberOfLines={1}>
            @{opponentUsername}
          </Text>
          {isWaiting ? (
            <Animated.Text style={[styles.status, { color: accentColor, fontWeight: '600' }, pulseStyle]}>
              {statusText}
            </Animated.Text>
          ) : (
            <Text style={[styles.status, { color: accentColor, fontWeight: isOutgoing ? '700' : '500' }]}>
              {statusText}
            </Text>
          )}
        </View>

        {/* Right side: emoji or time */}
        {statusEmoji ? (
          <Text style={styles.rightEmoji}>{statusEmoji}</Text>
        ) : (
          <Text style={styles.chevron}>›</Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export default React.memo(ChallengePill);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    height: 56,
    paddingRight: 14,
    gap: 12,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    height: '100%',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  emoji: {
    fontSize: 28,
    marginLeft: 8,
  },
  textCol: {
    flex: 1,
    gap: 1,
  },
  username: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  status: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  rightEmoji: {
    fontSize: 20,
  },
  chevron: {
    color: colors.text.secondary,
    fontSize: 22,
    fontWeight: '300',
  },
});
