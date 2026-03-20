import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

interface AnimatedSplashProps {
  onFinish: () => void;
}

export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const [lottieFinished, setLottieFinished] = useState(false);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (lottieFinished) {
      // Fade out after a brief hold
      opacity.value = withDelay(
        300,
        withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
      );
      setTimeout(() => onFinish(), 700);
    }
  }, [lottieFinished]);

  // Fallback: if Lottie doesn't fire onAnimationFinish, auto-dismiss after 3s
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!lottieFinished) {
        setLottieFinished(true);
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, fadeStyle]} pointerEvents="none">
      <LottieView
        source={require('../assets/lottie/splash-star.lottie')}
        autoPlay
        loop={false}
        style={styles.lottie}
        onAnimationFinish={() => setLottieFinished(true)}
      />
      <Text style={styles.appName}>Quizza</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  lottie: {
    width: 200,
    height: 200,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F1F5F9',
    marginTop: 16,
    letterSpacing: 2,
  },
});
