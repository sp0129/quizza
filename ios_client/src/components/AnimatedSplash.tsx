import React, { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
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
  const containerOpacity = useSharedValue(1);
  const textOpacity = useSharedValue(0);

  // Text fades in after a short delay
  useEffect(() => {
    textOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  useEffect(() => {
    if (lottieFinished) {
      // Brief hold then fade out
      containerOpacity.value = withDelay(
        200,
        withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
      );
      setTimeout(() => onFinish(), 500);
    }
  }, [lottieFinished]);

  // Fallback: auto-dismiss after 2s
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!lottieFinished) {
        setLottieFinished(true);
      }
    }, 2000);
    return () => clearTimeout(timeout);
  }, []);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
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
      <Animated.Text style={[styles.appName, textStyle]}>Quizza</Animated.Text>
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
    fontSize: 32,
    fontWeight: '800',
    color: '#F59E0B',
    marginTop: 12,
    letterSpacing: 3,
  },
});
