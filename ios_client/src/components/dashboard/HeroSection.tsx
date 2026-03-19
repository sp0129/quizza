import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import PizzaMascot from '../PizzaMascot';

interface HeroSectionProps {
  onExploreChallenges: () => void;
  delay?: number;
}

export default function HeroSection({ onExploreChallenges, delay = 0 }: HeroSectionProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.container}>
      <Text style={styles.title}>DISCOVER CHALLENGES</Text>

      <View style={styles.mascotRow}>
        <PizzaMascot mood="happy" size={80} />
      </View>

      <Text style={styles.subtitle}>Test your knowledge against{'\n'}the community</Text>

      <View style={styles.categoryRow}>
        <Text style={styles.categoryChip}>🔥 Science</Text>
        <Text style={styles.categoryChip}>📚 History</Text>
        <Text style={styles.categoryChip}>🎬 Movies</Text>
        <Text style={styles.categoryChip}>🧠 Geography</Text>
      </View>

      <TouchableOpacity
        style={styles.cta}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onExploreChallenges();
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaText}>Explore Open Challenges →</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  mascotRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    fontSize: 13,
    color: colors.text.secondary,
    backgroundColor: colors.bg.elevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cta: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#5B21B6',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
