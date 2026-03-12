import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { FILTER_CHIPS } from '../../utils/categoryColors';

interface FilterChipsProps {
  activeFilter: string;
  onSelect: (key: string) => void;
}

export default function FilterChips({ activeFilter, onSelect }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.container}
      keyboardShouldPersistTaps="handled"
    >
      {FILTER_CHIPS.map((chip) => {
        const active = chip.key === activeFilter;
        return (
          <TouchableOpacity
            key={chip.key}
            style={[s.chip, active && s.chipActive]}
            onPress={() => onSelect(chip.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.chipText, active && s.chipTextActive]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: {
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderColor: '#7C3AED',
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#C4B5FD',
  },
});
