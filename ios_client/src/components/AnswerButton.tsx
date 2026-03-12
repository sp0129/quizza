import React, { useEffect } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

// Animation constants matching uiux.md recommendations:
// - Press: spring with damping 15, stiffness 150 for a snappy physical feel
// - Wrong shake: ±10px horizontal oscillation over 250ms (5 phases × 50ms)
// - Color reveal: 300ms transition from neutral blue to green/red

type AnswerState = 'neutral' | 'correct' | 'wrong' | 'dimmed';

interface Props {
  text: string;
  state: AnswerState;
  disabled: boolean;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function AnswerButton({ text, state, disabled, onPress }: Props) {
  const scale = useSharedValue(1);
  // colorProgress: 0 = neutral (blue), 1 = revealed (green or red)
  const colorProgress = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Drive the color reveal and shake animations when state changes
  useEffect(() => {
    if (state === 'correct' || state === 'wrong') {
      // 300ms color transition from neutral to feedback color
      colorProgress.value = withTiming(1, { duration: 300 });

      if (state === 'wrong') {
        // Wordle-style shake: 5-phase horizontal oscillation ±10px over 250ms
        shakeX.value = withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else if (state === 'dimmed') {
      // Non-selected, non-correct buttons dim slightly
      opacity.value = withTiming(0.5, { duration: 300 });
    } else {
      // Reset to neutral
      colorProgress.value = 0;
      shakeX.value = 0;
      opacity.value = 1;
    }
  }, [state]);

  const handlePressIn = () => {
    // Spring scale down for tactile button-press feel
    scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handlePress = () => {
    // Light haptic on every tap for immediate tactile response
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => {
    // Interpolate background from calm blue → green (correct) or red (wrong)
    const targetColor = state === 'correct' ? colors.correct : colors.wrong;
    const bgColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      [colors.button, targetColor],
    );

    // Border follows the same interpolation but darker
    const targetBorder = state === 'correct' ? '#16A34A' : '#DC2626';
    const borderColor = interpolateColor(
      colorProgress.value,
      [0, 1],
      [colors.buttonBorder, targetBorder],
    );

    return {
      transform: [
        { scale: scale.value },
        { translateX: shakeX.value },
      ],
      backgroundColor: bgColor,
      borderColor,
      opacity: opacity.value,
    };
  });

  // Accessibility: show ✓ or ✗ icons alongside color for color-blind users (8% male population)
  const icon = state === 'correct' ? ' ✓' : state === 'wrong' ? ' ✗' : '';

  return (
    <AnimatedPressable
      style={[styles.button, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ disabled }}
    >
      <Text style={styles.text} numberOfLines={3}>
        {text}{icon}
      </Text>
    </AnimatedPressable>
  );
}

// React.memo prevents re-renders during sibling animations
export default React.memo(AnswerButton);

const styles = StyleSheet.create({
  button: {
    // 60dp height — within the 56-64dp recommended range for thumb-friendly touch targets
    minHeight: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    // Duolingo-style depth: 4px darker bottom border simulating physical button
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    color: colors.text.onButton,
    fontSize: 17,         // 17px per typography spec
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
});
