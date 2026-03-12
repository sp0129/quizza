import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface EmptySearchStateProps {
  query: string;
  onClear: () => void;
}

export default function EmptySearchState({ query, onClear }: EmptySearchStateProps) {
  return (
    <View style={s.container}>
      <Text style={s.emoji}>🔍</Text>
      <Text style={s.title}>No categories found</Text>
      <Text style={s.subtitle}>
        Nothing matches "{query}" — try a different search
      </Text>
      <TouchableOpacity style={s.button} onPress={onClear} activeOpacity={0.7}>
        <Text style={s.buttonText}>Browse All Categories</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderWidth: 1,
    borderColor: '#7C3AED',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#C4B5FD',
    fontSize: 14,
    fontWeight: '700',
  },
});
