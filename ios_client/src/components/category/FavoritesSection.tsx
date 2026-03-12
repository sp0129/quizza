import React, { useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getCategoryCardColors } from '../../utils/categoryColors';
import { useFavoritesStore } from '../../stores/favorites';

interface Category {
  id: number;
  name: string;
}

interface FavoritesSectionProps {
  categories: Category[];
  selectedId: number | null;
  onSelect: (item: Category) => void;
}

export default function FavoritesSection({ categories, selectedId, onSelect }: FavoritesSectionProps) {
  const favorites = useFavoritesStore((s) => s.favorites);
  const favCategories = categories.filter((c) => favorites.includes(c.id)).slice(0, 6);

  const handlePress = useCallback(
    (item: Category) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelect(item);
    },
    [onSelect],
  );

  if (favCategories.length === 0) return null;

  return (
    <View style={s.container}>
      <Text style={s.title}>Your Favorites</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {favCategories.map((item) => {
          const colors = getCategoryCardColors(item.name, item.id);
          const selected = selectedId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                s.chip,
                { backgroundColor: colors.bg, borderColor: selected ? colors.accent : 'rgba(255,255,255,0.06)' },
              ]}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              <Text style={s.chipEmoji}>{colors.emoji}</Text>
              <Text style={[s.chipName, { color: colors.accent }]} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  title: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  chipEmoji: {
    fontSize: 22,
  },
  chipName: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 90,
  },
});
