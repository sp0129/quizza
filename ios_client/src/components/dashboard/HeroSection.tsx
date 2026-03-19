import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';

interface HeroSectionProps {
  onExploreChallenges: () => void;
  delay?: number;
}

export default function HeroSection({ onExploreChallenges, delay = 0 }: HeroSectionProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.container}>
      <View style={styles.contentRow}>
        {/* Left: text */}
        <View style={styles.textCol}>
          <Text style={styles.title}>DISCOVER CHALLENGES</Text>
          <Text style={styles.subtitle}>Test your knowledge against the community</Text>
          <Text style={styles.speedHint}>Quick thinking = bigger scores! ⚡</Text>
        </View>

        {/* Right: explorer avatar, tilted */}
        <View style={styles.imageCol}>
          <Image
            source={require('../../assets/avatars/explorer-hero.png')}
            style={styles.explorerImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Category pills */}
      <View style={styles.categoryRow}>
        <Text style={styles.categoryChip}>🔥 Science</Text>
        <Text style={styles.categoryChip}>📚 History</Text>
        <Text style={styles.categoryChip}>🎬 Movies</Text>
        <Text style={styles.categoryChip}>🧠 Geography</Text>
      </View>

      {/* Full-width CTA */}
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
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  textCol: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    lineHeight: 20,
  },
  speedHint: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gold,
  },
  imageCol: {
    width: 110,
    alignItems: 'center',
    marginLeft: 4,
  },
  explorerImage: {
    width: 105,
    height: 105,
    transform: [{ rotate: '6deg' }],
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    fontSize: 12,
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
