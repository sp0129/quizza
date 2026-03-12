import React, { useCallback } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';

interface ModeCardProps {
  icon: string;
  label: string;
  color: string;
  badgeCount?: number;
  onPress: () => void;
  subtitle?: string;
}

function ModeCard({ icon, label, color, badgeCount, onPress, subtitle }: ModeCardProps) {
  const scale = useSharedValue(1);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.93, { damping: 12, stiffness: 400 });
    })
    .onFinalize((_e, success) => {
      scale.value = withSpring(1, { damping: 10, stiffness: 300 });
      if (success) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={[styles.card, { borderColor: color + '30' }, animatedStyle]}>
        {/* Glow background */}
        <Animated.View style={[styles.glow, { backgroundColor: color + '10' }]} />

        {/* Badge */}
        {badgeCount !== undefined && badgeCount > 0 && (
          <Animated.View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{badgeCount}</Text>
          </Animated.View>
        )}

        {/* Icon */}
        <Text style={styles.icon}>{icon}</Text>

        {/* Label */}
        <Text style={[styles.label, { color }]}>{label}</Text>

        {/* Subtitle */}
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </Animated.View>
    </GestureDetector>
  );
}

export default React.memo(ModeCard);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    gap: 4,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  icon: {
    fontSize: 28,
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
});
