import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

interface OnboardingOverlayProps {
  visible: boolean;
  onStartSolo: () => void;
  onDismiss: () => void;
}

const MODES = [
  {
    emoji: '🎯',
    title: 'Warm Up Solo',
    desc: '20,000+ questions. 35+ categories. No friends required. Yet.',
    titleColor: '#22C55E',
  },
  {
    emoji: '🏟️',
    title: 'Take On the Community',
    desc: 'Browse challenges from other players. Beat their score. Leave your mark.',
    titleColor: '#3B82F6',
  },
  {
    emoji: '🚪',
    title: 'Host a Live Game Night',
    desc: 'Share a code, play together in real time. For when the group chat needs settling.',
    titleColor: '#F59E0B',
  },
  {
    emoji: '⚔️',
    title: 'Challenge a Friend',
    desc: 'Send a direct duel. Play on your own time. Find out who really knows more.',
    titleColor: '#EF4444',
  },
];

export default function OnboardingOverlay({
  visible,
  onStartSolo,
  onDismiss,
}: OnboardingOverlayProps) {
  const insets = useSafeAreaInsets();

  const handleCta = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStartSolo();
  }, [onStartSolo]);

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
        style={[styles.card, { marginTop: insets.top + 40, maxHeight: '85%' }]}
      >
        <TouchableOpacity style={styles.closeX} onPress={handleDismiss} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.closeXText}>✕</Text>
        </TouchableOpacity>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardContent}
          bounces={false}
        >
          <Image
            source={require('../assets/mascot/explorer-star.png')}
            style={styles.mascot}
            resizeMode="contain"
          />

          <Text style={styles.title}>Welcome to Quizza!</Text>
          <Text style={styles.subtitle}>Pick your battlefield:</Text>

          <View style={styles.modesContainer}>
            {MODES.map((mode, i) => (
              <View key={i} style={styles.modeCard}>
                <Text style={styles.modeEmoji}>{mode.emoji}</Text>
                <View style={styles.modeContent}>
                  <Text style={[styles.modeTitle, { color: mode.titleColor }]}>{mode.title}</Text>
                  <Text style={styles.modeDesc}>{mode.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={handleCta}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>Start Playing Solo</Text>
            <Text style={styles.ctaArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss} activeOpacity={0.7}>
            <Text style={styles.dismissText}>I'll figure it out myself</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    zIndex: 200,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: 24,
    marginHorizontal: 20,
    maxWidth: 380,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: colors.border + '30',
  },
  cardContent: {
    padding: 22,
    alignItems: 'center',
  },
  mascot: {
    width: 60,
    height: 60,
    marginBottom: 6,
  },
  title: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: 3,
    marginBottom: 14,
  },
  modesContainer: {
    width: '100%',
    gap: 8,
    marginBottom: 18,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border + '25',
  },
  modeEmoji: {
    fontSize: 22,
    marginTop: 2,
  },
  modeContent: {
    flex: 1,
    gap: 2,
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  modeDesc: {
    color: colors.text.secondary,
    fontSize: 11,
    lineHeight: 16,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  ctaArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
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
  closeX: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(239,68,68,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeXText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
});
