import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { colors } from '../theme/colors';

interface ErrorOverlayProps {
  visible: boolean;
  title?: string;
  message?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export default function ErrorOverlay({
  visible,
  title = 'Uh oh...',
  message = 'Something went wrong.',
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: ErrorOverlayProps) {
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
    >
      <View style={styles.content}>
        <LottieView
          source={require('../assets/lottie/error-sad.lottie')}
          autoPlay
          loop
          style={styles.lottie}
        />

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.buttons}>
          {primaryLabel && onPrimary && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onPrimary}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
            </TouchableOpacity>
          )}

          {secondaryLabel && onSecondary && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={onSecondary}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>{secondaryLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 32,
  },
  lottie: {
    width: 160,
    height: 160,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.gold,
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.secondary,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  buttons: {
    width: '100%',
    marginTop: 32,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.text.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
