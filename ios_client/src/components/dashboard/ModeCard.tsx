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
  const shineOpacity = useSharedValue(0.7);
  const shine2Opacity = useSharedValue(0.18);
  const glowOpacity = useSharedValue(0.18);

  const g = gem ?? { base: color, light: color, dark: color };

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withTiming(0.97, { duration: 80 });
      shineOpacity.value = withTiming(0.85, { duration: 80 });
      shine2Opacity.value = withTiming(0.3, { duration: 80 });
      glowOpacity.value = withTiming(0.3, { duration: 80 });
    })
    .onFinalize((_e, success) => {
      'worklet';
      scale.value = withSpring(1, { mass: 0.7, damping: 12, stiffness: 120 });
      shineOpacity.value = withTiming(0.7, { duration: 250 });
      shine2Opacity.value = withTiming(0.18, { duration: 250 });
      glowOpacity.value = withTiming(0.18, { duration: 250 });
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

  const shine2Style = useAnimatedStyle(() => ({
    opacity: shine2Opacity.value,
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
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 14,
            elevation: 8,
          },
        ]}
      >
        {/* Layer 3: Base gradient (depth & curvature) */}
        <LinearGradient
          colors={[g.light, g.base, g.dark]}
          locations={[0, 0.45, 1]}
          style={styles.pillGradient}
        >
          {/* Layer 6: Inner shadow (bottom beveled edge) */}
          <LinearGradient
            colors={['transparent', g.dark + '80']}
            locations={[0.7, 1]}
            style={styles.innerShadow}
          />

          {/* Layer 4: White outline / premium edge (top + sides) */}
          <View style={styles.topOutline} />

          {/* Layer 2: Secondary subtle glow (mid-section) */}
          <Animated.View style={[styles.shine2, shine2Style]} />

          {/* Layer 1: Top bright shine (crisp highlight) */}
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

const RADIUS = 20;

const styles = StyleSheet.create({
  pillOuter: {
    height: 60,
    borderRadius: RADIUS,
  },
  pillGradient: {
    flex: 1,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  // Layer 6: Inner shadow at bottom
  innerShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS,
  },
  // Layer 4: White outline on top + sides
  topOutline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  // Layer 2: Secondary subtle glow
  shine2: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    height: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  // Layer 1: Top bright shine
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  icon: {
    fontSize: 32,
  },
  textColumn: {
    gap: 1,
  },
  label: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 14,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
