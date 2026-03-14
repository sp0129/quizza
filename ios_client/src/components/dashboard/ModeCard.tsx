import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface GemColors {
  base: string;
  light: string;
  dark: string;
}

interface ModeCardProps {
  icon: string;
  label: string;
  color: string;
  badgeCount?: number;
  onPress: () => void;
  subtitle?: string;
  gem?: GemColors;
}

function ModeCard({ icon, label, color, badgeCount, onPress, subtitle, gem }: ModeCardProps) {
  const scale = useSharedValue(1);

  const g = gem ?? { base: color, light: color, dark: color };

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withTiming(0.97, { duration: 80 });
    })
    .onFinalize((_e, success) => {
      'worklet';
      scale.value = withSpring(1, { mass: 0.7, damping: 12, stiffness: 120 });
      if (success) runOnJS(handlePress)();
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[
          styles.outer,
          animStyle,
          {
            shadowColor: g.base,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 6,
          },
        ]}
      >
        <LinearGradient
          colors={[g.light, g.base, g.dark]}
          locations={[0, 0.4, 1]}
          style={styles.gradient}
        >
          {/* Soft top highlight */}
          <LinearGradient
            colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
            style={styles.topHighlight}
          />

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.icon}>{icon}</Text>
            <View style={styles.textCol}>
              <Text style={styles.label}>{label}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          </View>

          {/* Badge */}
          {badgeCount !== undefined && badgeCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeCount}</Text>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </GestureDetector>
  );
}

export default React.memo(ModeCard);

const R = 16;

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    height: 52,
    borderRadius: R,
  },
  gradient: {
    flex: 1,
    borderRadius: R,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 22,
    borderTopLeftRadius: R,
    borderTopRightRadius: R,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 14,
  },
  icon: {
    fontSize: 26,
  },
  textCol: {
    gap: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 14,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
