import React, { useCallback } from 'react';
import { Text, View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { getCategoryCardColors, type CategoryCardColors } from '../../utils/categoryColors';
import { useFavoritesStore } from '../../stores/favorites';

interface Category {
  id: number;
  name: string;
}

interface CategoryCardProps {
  item: Category;
  index: number;
  isSelected: boolean;
  onSelect: (item: Category) => void;
}

const SPRING_CONFIG = { damping: 15, stiffness: 300 };
const SELECT_SPRING = { mass: 0.8, damping: 10, stiffness: 200 };

function CategoryCardInner({ item, index, isSelected, onSelect }: CategoryCardProps) {
  const scale = useSharedValue(1);
  const starScale = useSharedValue(1);
  const selectScale = useSharedValue(isSelected ? 1.05 : 1);
  const checkOpacity = useSharedValue(isSelected ? 1 : 0);
  const checkScale = useSharedValue(isSelected ? 1 : 0.8);

  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isFav = favorites.includes(item.id);
  const colors = getCategoryCardColors(item.name, item.id);

  // Animate selection state when isSelected prop changes
  React.useEffect(() => {
    if (isSelected) {
      selectScale.value = withSpring(1.05, SELECT_SPRING);
      checkOpacity.value = withTiming(1, { duration: 200 });
      checkScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    } else {
      selectScale.value = withSpring(1, SELECT_SPRING);
      checkOpacity.value = withTiming(0, { duration: 200 });
      checkScale.value = withTiming(0.8, { duration: 200 });
    }
  }, [isSelected]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * selectScale.value }],
  }));

  const starAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));

  const checkAnimStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(item);
  }, [item, onSelect]);

  const handleFavoritePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    starScale.value = withSpring(1.3, SPRING_CONFIG, () => {
      starScale.value = withSpring(1, SPRING_CONFIG);
    });
    toggleFavorite(item.id);
  }, [item.id, toggleFavorite, starScale]);

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 60).duration(400).springify()}
      style={s.wrapper}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.95, SPRING_CONFIG); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING_CONFIG); }}
        onPress={handlePress}
      >
        <Animated.View
          style={[
            s.card,
            {
              backgroundColor: colors.bg,
              borderColor: isSelected ? '#22C55E' : 'rgba(255,255,255,0.06)',
              borderWidth: isSelected ? 2.5 : 1.5,
              // Enhanced shadow when selected
              shadowOpacity: isSelected ? 0.4 : 0.15,
              shadowRadius: isSelected ? 12 : 4,
              shadowColor: isSelected ? '#22C55E' : '#000',
            },
            cardAnimStyle,
          ]}
        >
          {/* Selection checkmark badge */}
          <Animated.View style={[s.checkBadge, checkAnimStyle]}>
            <Text style={s.checkText}>✓</Text>
          </Animated.View>

          {/* Favorite star */}
          <Pressable
            onPress={handleFavoritePress}
            hitSlop={8}
            style={s.starBtn}
          >
            <Animated.Text style={[s.starText, starAnimStyle]}>
              {isFav ? '★' : '☆'}
            </Animated.Text>
          </Pressable>

          {/* Content */}
          <Text style={s.emoji}>{colors.emoji}</Text>
          <Text style={[s.name, { color: colors.accent }]} numberOfLines={2}>
            {item.name}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export const CategoryCard = React.memo(CategoryCardInner);

const s = StyleSheet.create({
  wrapper: {
    flex: 1,
    paddingHorizontal: 6,
    paddingBottom: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 130,
    // Default shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    // Shadow for visibility
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  starBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  starText: {
    fontSize: 18,
    color: '#F59E0B',
  },
  emoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
});
