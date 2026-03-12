import React, { useCallback } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
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

function CategoryCardInner({ item, index, isSelected, onSelect }: CategoryCardProps) {
  const scale = useSharedValue(1);
  const starScale = useSharedValue(1);
  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isFav = favorites.includes(item.id);
  const colors = getCategoryCardColors(item.name, item.id);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const starAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
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
            { backgroundColor: colors.bg, borderColor: isSelected ? colors.accent : 'rgba(255,255,255,0.06)' },
            animStyle,
          ]}
        >
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
