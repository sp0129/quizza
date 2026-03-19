import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '../../theme/colors';

interface ProgressSectionProps {
  dailyStreak: number;
  bestScore: number;
  gamesPlayed: number;
  delay?: number;
}

export default function ProgressSection({ dailyStreak, bestScore, gamesPlayed, delay = 0 }: ProgressSectionProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.container}>
      <Text style={styles.title}>🏆 YOUR PROGRESS</Text>

      <View style={styles.statRow}>
        <Text style={styles.statEmoji}>🔥</Text>
        <View style={styles.statContent}>
          <Text style={styles.statLabel}>Daily Streak</Text>
          <Text style={styles.statValue}>
            {dailyStreak > 0 ? `${dailyStreak} day${dailyStreak > 1 ? 's' : ''}! 🚀` : ''}
          </Text>
        </View>
        <Text style={styles.statHint}>
          {dailyStreak > 0 ? 'Keep it going!' : 'Start your streak today! 🔥'}
        </Text>
      </View>

      <View style={styles.statRow}>
        <Text style={styles.statEmoji}>⭐</Text>
        <View style={styles.statContent}>
          <Text style={styles.statLabel}>Best Score</Text>
          <Text style={styles.statValue}>{bestScore > 0 ? `${bestScore} pts` : '—'}</Text>
        </View>
        <Text style={styles.statHint}>
          {bestScore > 0 ? 'Can you beat your best?' : 'Your first score is coming!'}
        </Text>
      </View>

      <View style={styles.statRow}>
        <Text style={styles.statEmoji}>📊</Text>
        <View style={styles.statContent}>
          <Text style={styles.statLabel}>Games Played</Text>
          <Text style={styles.statValue}>{gamesPlayed}</Text>
        </View>
        <Text style={styles.statHint}>
          {gamesPlayed > 0 ? 'Speed is your secret weapon!' : 'Every game makes you smarter!'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  statEmoji: { fontSize: 20, width: 28 },
  statContent: { flex: 1 },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '700',
  },
  statHint: {
    fontSize: 11,
    color: colors.text.secondary,
    fontStyle: 'italic',
    maxWidth: 120,
    textAlign: 'right',
  },
});
