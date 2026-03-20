import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

interface TransitionOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function TransitionOverlay({ visible, onDismiss }: TransitionOverlayProps) {
  if (!visible) return null;

  return (
    <TouchableOpacity
      style={styles.overlay}
      activeOpacity={1}
      onPress={onDismiss}
    >
      <Animated.View entering={FadeIn.duration(300)} style={styles.content}>
        <LottieView
          source={require('../assets/lottie/splash-star.lottie')}
          autoPlay
          loop
          style={styles.lottie}
        />
        <Text style={styles.title}>You're all set! 🎉</Text>
        <Text style={styles.subtitle}>
          New features unlocked —{'\n'}challenges, stats & more await!
        </Text>
        <Text style={styles.tapHint}>Tap anywhere to continue</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9998,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  lottie: {
    width: 180,
    height: 180,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F59E0B',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  tapHint: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 24,
    fontStyle: 'italic',
  },
});
