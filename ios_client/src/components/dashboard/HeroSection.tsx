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
        {/* Left: text + CTA */}
        <View style={styles.textCol}>
          <Text style={styles.title}>DISCOVER CHALLENGES</Text>
          <Text style={styles.subtitle}>Test your knowledge against the community</Text>
          <Text style={styles.speedHint}>Quick thinking = bigger scores! ⚡</Text>
          <TouchableOpacity
            style={styles.cta}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onExploreChallenges();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaText}>Explore →</Text>
          </TouchableOpacity>
        </View>

        {/* Right: explorer avatar, tilted */}
        <View style={styles.imageCol}>
          <Image
            source={require('../../assets/avatars/explorer.png')}
            style={styles.explorerImage}
            resizeMode="contain"
          />
        </View>
      </View>
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
    marginBottom: 4,
  },
  cta: {
    backgroundColor: colors.brand.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    borderBottomWidth: 3,
    borderBottomColor: '#5B21B6',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  imageCol: {
    width: 90,
    alignItems: 'center',
    marginLeft: 8,
  },
  explorerImage: {
    width: 85,
    height: 85,
    transform: [{ rotate: '8deg' }],
  },
});
