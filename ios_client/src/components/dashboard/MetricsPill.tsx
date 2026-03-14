import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';

interface MetricsPillProps {
  icon: string;
  label: string;
  value: number;
  suffix?: string;
  color?: string;
}

function MetricsPill({
  icon,
  label,
  value,
  suffix = '',
  color = colors.brand.primary,
}: MetricsPillProps) {
  const scale = useSharedValue(1);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === display) return;

    // Animate the number counting up
    const start = display;
    const diff = value - start;
    const steps = Math.min(Math.abs(diff), 15);
    if (steps === 0) { setDisplay(value); return; }

    const stepTime = 400 / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setDisplay(Math.round(start + (diff * step) / steps));
      if (step >= steps) {
        clearInterval(interval);
        setDisplay(value);
      }
    }, stepTime);

    // Bounce the pill
    scale.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );

    return () => clearInterval(interval);
  }, [value]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.pill, { backgroundColor: color + '20' }, pillStyle]}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.content}>
        <Text style={[styles.value, { color }]}>
          {display}{suffix}
        </Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Animated.View>
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
