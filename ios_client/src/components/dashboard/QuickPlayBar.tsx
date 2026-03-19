import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { getCategoryTheme } from '../../utils/categoryThemes';

interface QuickPlayBarProps {
  category: string;
  onPress: () => void;
  delay?: number;
}

export default function QuickPlayBar({ category, onPress, delay = 0 }: QuickPlayBarProps) {
  const theme = getCategoryTheme(category);

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)}>
      <TouchableOpacity
        style={styles.bar}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.text}>▶ Play {category} Again {theme.emoji}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#22C55E',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 4,
    borderBottomColor: '#16A34A',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
