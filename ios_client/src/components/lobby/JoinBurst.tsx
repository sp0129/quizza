import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const COLORS = ['#7C3AED', '#22C55E', '#06B6D4', '#F59E0B', '#EF4444'];
const COUNT = 10;

interface Dot {
  angle: number;
  distance: number;
  size: number;
  color: string;
  delay: number;
}

function BurstDot({ dot }: { dot: Dot }) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    progress.value = withDelay(dot.delay, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    opacity.value = withDelay(dot.delay + 300, withTiming(0, { duration: 300 }));
  }, []);

  const style = useAnimatedStyle(() => {
    const x = Math.cos(dot.angle) * dot.distance * progress.value;
    const y = Math.sin(dot.angle) * dot.distance * progress.value;
    return {
      transform: [{ translateX: x }, { translateY: y }, { scale: 1 - progress.value * 0.5 }],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: dot.size,
          height: dot.size,
          borderRadius: dot.size / 2,
          backgroundColor: dot.color,
        },
        style,
      ]}
    />
  );
}

export default function JoinBurst() {
  const dots = useMemo<Dot[]>(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      angle: (i / COUNT) * Math.PI * 2,
      distance: 30 + Math.random() * 20,
      size: 4 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 100,
    })),
  []);

  return (
    <>
      {dots.map((d, i) => (
        <BurstDot key={i} dot={d} />
      ))}
    </>
  );
}
