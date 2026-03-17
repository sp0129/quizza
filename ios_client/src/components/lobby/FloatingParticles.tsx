import React, { useMemo } from 'react';
import { Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

const PARTICLE_COUNT = 18;

interface ParticleConfig {
  x: number;
  y: number;
  size: number;
  durationFade: number;
  durationDrift: number;
  driftY: number;
}

function Twinkle({ config }: { config: ParticleConfig }) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(0);

  React.useEffect(() => {
    // Fade in/out like a twinkle
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4 + Math.random() * 0.3, { duration: config.durationFade, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: config.durationFade, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true,
    );
    // Gentle drift
    ty.value = withRepeat(
      withSequence(
        withTiming(config.driftY, { duration: config.durationDrift, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: config.durationDrift, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
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
          backgroundColor: '#FFFFFF',
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
      size: 2 + Math.random() * 3,
      durationFade: 2000 + Math.random() * 3000,
      durationDrift: 5000 + Math.random() * 4000,
      driftY: 10 + Math.random() * 20,
    })),
  []);

  return (
    <>
      {particles.map((p, i) => (
        <Twinkle key={i} config={p} />
      ))}
    </>
  );
}
