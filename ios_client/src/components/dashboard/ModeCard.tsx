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
  const shineOpacity = useSharedValue(0.4);
  const glowOpacity = useSharedValue(0.2);

  const g = gem ?? { base: color, light: color, dark: color };

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.98, { damping: 12, stiffness: 400 });
      shineOpacity.value = withTiming(0.6, { duration: 100 });
      glowOpacity.value = withTiming(0.35, { duration: 100 });
    })
    .onFinalize((_e, success) => {
      'worklet';
      scale.value = withSpring(1, { mass: 0.8, damping: 10, stiffness: 100 });
      shineOpacity.value = withTiming(0.4, { duration: 300 });
      glowOpacity.value = withTiming(0.2, { duration: 300 });
      if (success) {
        runOnJS(handlePress)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const shineStyle = useAnimatedStyle(() => ({
    opacity: shineOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[
          styles.pillOuter,
          animatedStyle,
          glowStyle,
          {
            shadowColor: g.base,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 18,
            elevation: 10,
          },
        ]}
      >
        {/* Layer 3: Base gradient (depth) */}
        <LinearGradient
          colors={[g.light, g.base, g.dark]}
          locations={[0, 0.5, 1]}
          style={styles.pillGradient}
        >
          {/* Layer 4: Inner shadow / beveled edge */}
          <View style={[styles.innerBevel, { borderColor: g.dark + '66' }]} />

          {/* Layer 2: Mid-facet glow (iridescence) */}
          <View style={[styles.facetGlow, { backgroundColor: g.light + '30' }]} />

          {/* Layer 1: Bright top highlight (shine) */}
          <Animated.View style={[styles.shine, shineStyle]} />

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.icon}>{icon}</Text>
            <View style={styles.textColumn}>
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

const styles = StyleSheet.create({
  pillOuter: {
    height: 76,
    borderRadius: 22,
    overflow: 'hidden',
  },
  pillGradient: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
  // Layer 4: Inner bevel
  innerBevel: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  // Layer 2: Mid-facet glow
  facetGlow: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    height: '40%',
    borderRadius: 40,
  },
  // Layer 1: Top shine
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  icon: {
    fontSize: 36,
  },
  textColumn: {
    gap: 2,
  },
  label: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 16,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
