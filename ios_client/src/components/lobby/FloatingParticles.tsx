import React, { useMemo } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

const PARTICLE_COUNT = 14;
const COLORS = [
  'rgba(124,58,237,0.15)',   // purple
  'rgba(6,182,212,0.12)',    // cyan
  'rgba(245,158,11,0.10)',   // amber
  'rgba(34,197,94,0.10)',    // green
];

interface ParticleConfig {
  x: number;
  y: number;
  size: number;
  color: string;
  driftY: number;
  driftX: number;
  durationY: number;
  durationX: number;
}

function Particle({ config }: { config: ParticleConfig }) {
  const ty = useSharedValue(0);
  const tx = useSharedValue(0);

  React.useEffect(() => {
    ty.value = withRepeat(
      withSequence(
        withTiming(config.driftY, { duration: config.durationY, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: config.durationY, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true,
    );
    tx.value = withRepeat(
      withSequence(
        withTiming(config.driftX, { duration: config.durationX, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: config.durationX, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { translateX: tx.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: config.x,
          top: config.y,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
        },
        style,
      ]}
    />
  );
}

export default function FloatingParticles() {
  const particles = useMemo<ParticleConfig[]>(() =>
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: 4 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      driftY: 30 + Math.random() * 40,
      driftX: (Math.random() - 0.5) * 30,
      durationY: 4000 + Math.random() * 3000,
      durationX: 5000 + Math.random() * 4000,
    })),
  []);

  return (
    <>
      {particles.map((p, i) => (
        <Particle key={i} config={p} />
      ))}
    </>
  );
}
