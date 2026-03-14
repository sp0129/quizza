import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
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

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.93, { damping: 12, stiffness: 400 });
    })
    .onFinalize((_e, success) => {
      'worklet';
      scale.value = withSpring(1, { damping: 10, stiffness: 300 });
      if (success) {
        runOnJS(handlePress)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[
          styles.cardOuter,
          {
            shadowColor: color,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 8,
          },
          animatedStyle,
        ]}
      >
        {/* 3D bottom edge */}
        <View style={[styles.bottomEdge, { backgroundColor: color + '50' }]} />

        {/* Main card face */}
        <View style={[styles.card, { borderColor: color + '55', backgroundColor: color + '18' }]}>
          {/* Badge */}
          {badgeCount !== undefined && badgeCount > 0 && (
            <View style={[styles.badge, { backgroundColor: color }]}>
              <Text style={styles.badgeText}>{badgeCount}</Text>
            </View>
          )}

          {/* Icon */}
          <Text style={styles.icon}>{icon}</Text>

          {/* Label */}
          <Text style={[styles.label, { color }]}>{label}</Text>

          {/* Subtitle */}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export default React.memo(ModeCard);

const styles = StyleSheet.create({
  cardOuter: {
    flex: 1,
    height: 108, // 104 card + 4 bottom edge
    borderRadius: 16,
  },
  bottomEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 104,
    borderRadius: 16,
  },
  card: {
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    gap: 4,
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
