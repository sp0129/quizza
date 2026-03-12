import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  ctaLabel: string;
  onCtaPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
}

function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  onCtaPress,
  secondaryLabel,
  onSecondaryPress,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <TouchableOpacity
        style={styles.cta}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onCtaPress();
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </TouchableOpacity>
      {secondaryLabel && onSecondaryPress && (
        <TouchableOpacity
          style={styles.secondary}
          onPress={onSecondaryPress}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default React.memo(EmptyState);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 10,
  },
  icon: {
    fontSize: 56,
    marginBottom: 4,
  },
  title: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  cta: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    minWidth: 180,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondary: {
    paddingVertical: 8,
  },
  secondaryText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
