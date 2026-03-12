import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  useDerivedValue,
  useAnimatedProps,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';

interface MetricsPillProps {
  icon: string;
  label: string;
  value: number;
  suffix?: string;
  color?: string;
  animate?: boolean;
}

function MetricsPill({
  icon,
  label,
  value,
  suffix = '',
  color = colors.brand.primary,
  animate = true,
}: MetricsPillProps) {
  const displayValue = useSharedValue(animate ? 0 : value);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (animate) {
      displayValue.value = withTiming(value, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withSequence(
        withSpring(1.15, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 }),
      );
    } else {
      displayValue.value = value;
    }
  }, [value, animate, displayValue, scale]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // We display the rounded integer of the animated value
  const animatedText = useDerivedValue(() => {
    return `${Math.round(displayValue.value)}${suffix}`;
  });

  return (
    <Animated.View style={[styles.pill, { backgroundColor: color + '20' }, pillStyle]}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.content}>
        <AnimatedNumber value={animatedText} color={color} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </Animated.View>
  );
}

// Simple component that reads the derived value
function AnimatedNumber({
  value,
  color,
}: {
  value: Animated.SharedValue<string>;
  color: string;
}) {
  // Since we can't directly use useAnimatedProps on Text easily,
  // we use a workaround with AnimatedProps on a View and display via re-render
  const animStyle = useAnimatedStyle(() => ({
    opacity: 1, // trigger re-render
  }));

  return (
    <Animated.Text style={[styles.value, { color }, animStyle]}>
      {/* We fall back to reading .value directly — works with Reanimated on JS thread */}
      {Math.round(value.value as unknown as number) || value.value}
    </Animated.Text>
  );
}

export default React.memo(MetricsPill);

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    minWidth: 80,
  },
  icon: {
    fontSize: 16,
  },
  content: {
    alignItems: 'flex-start',
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
