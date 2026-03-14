import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const COLORS = ['#7C3AED', '#2563EB', '#22C55E', '#F59E0B', '#EF4444'];
const PARTICLE_COUNT = 40;

interface Particle {
  id: number;
  x: number;
  size: number;
  color: string;
  delay: number;
  rotation: number;
  drift: number;
}

function ConfettiPiece({ particle }: { particle: Particle }) {
  const translateY = useSharedValue(-particle.size);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    const duration = 2000 + Math.random() * 1000;
    translateY.value = withDelay(
      particle.delay,
      withTiming(SCREEN_H + 50, { duration, easing: Easing.in(Easing.quad) }),
    );
    rotate.value = withDelay(
      particle.delay,
      withTiming(particle.rotation, { duration, easing: Easing.linear }),
    );
    translateX.value = withDelay(
      particle.delay,
      withTiming(particle.drift, { duration, easing: Easing.out(Easing.quad) }),
    );
    opacity.value = withDelay(
      particle.delay + duration * 0.7,
      withTiming(0, { duration: duration * 0.3 }),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: particle.x,
          top: -20,
          width: particle.size,
          height: particle.size,
          backgroundColor: particle.color,
          borderRadius: particle.size > 12 ? 2 : 1,
        },
        style,
      ]}
    />
  );
}

export default function ConfettiOverlay() {
  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_W,
      size: 8 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 400,
      rotation: 360 + Math.random() * 720,
      drift: (Math.random() - 0.5) * 80,
    })),
  []);

  return (
    <>
      {particles.map((p) => (
        <ConfettiPiece key={p.id} particle={p} />
      ))}
    </>
  );
}
