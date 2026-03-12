import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

interface OnboardingOverlayProps {
  visible: boolean;
  onCreateRoom: () => void;
  onDismiss: () => void;
}

export default function OnboardingOverlay({
  visible,
  onCreateRoom,
  onDismiss,
}: OnboardingOverlayProps) {
  const insets = useSafeAreaInsets();

  const handleCreateRoom = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCreateRoom();
  }, [onCreateRoom]);

  const handleDismiss = useCallback(() => {
    Haptics.selectionAsync();
    onDismiss();
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
    >
      <Animated.View
        entering={SlideInUp.duration(400).springify().damping(16)}
        style={[styles.card, { marginTop: insets.top + 60 }]}
      >
        {/* Mascot / Icon */}
        <Text style={styles.mascotIcon}>🍕</Text>

        {/* Welcome message */}
        <Text style={styles.title}>Welcome to Quizza!</Text>
        <Text style={styles.subtitle}>Here's how to get started:</Text>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: '#2563EB' + '25' }]}>
              <Text style={[styles.stepNumberText, { color: '#2563EB' }]}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Start with Group Play</Text>
              <Text style={styles.stepDesc}>
                Create a room, share the code, and play trivia with friends together.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: '#F97316' + '25' }]}>
              <Text style={[styles.stepNumberText, { color: '#F97316' }]}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Challenge friends 1v1</Text>
              <Text style={styles.stepDesc}>
                Send async challenges to friends and see who knows more.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: '#7C3AED' + '25' }]}>
              <Text style={[styles.stepNumberText, { color: '#7C3AED' }]}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Go Solo anytime</Text>
              <Text style={styles.stepDesc}>
                Practice and improve your trivia skills at your own pace.
              </Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={handleCreateRoom}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>Create a Room</Text>
          <Text style={styles.ctaBtnIcon}>👥</Text>
        </TouchableOpacity>

        {/* Dismiss */}
        <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss} activeOpacity={0.7}>
          <Text style={styles.dismissText}>I'll explore on my own</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 200,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: 24,
    marginHorizontal: 20,
    padding: 28,
    alignItems: 'center',
    maxWidth: 380,
    width: '90%',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: colors.border + '30',
  },
  mascotIcon: {
    fontSize: 52,
    marginBottom: 8,
  },
  title: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  stepsContainer: {
    width: '100%',
    gap: 14,
    marginBottom: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '800',
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  stepDesc: {
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 17,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    // Glow
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  ctaBtnIcon: {
    fontSize: 16,
  },
  dismissBtn: {
    paddingVertical: 12,
    marginTop: 4,
  },
  dismissText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
