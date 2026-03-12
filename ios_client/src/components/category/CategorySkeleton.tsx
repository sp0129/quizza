import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';

function SkeletonCard({ delay }: { delay: number }) {
  return (
    <View style={s.cardWrapper}>
      <MotiView
        from={{ opacity: 0.3 }}
        animate={{ opacity: 0.7 }}
        transition={{
          type: 'timing',
          duration: 800,
          loop: true,
          delay,
        }}
        style={s.card}
      >
        <MotiView style={s.emojiPlaceholder} />
        <MotiView style={s.textPlaceholder} />
        <MotiView style={s.textPlaceholderShort} />
      </MotiView>
    </View>
  );
}

export default function CategorySkeleton() {
  return (
    <View style={s.grid}>
      {Array.from({ length: 6 }, (_, i) => (
        <SkeletonCard key={i} delay={i * 100} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  cardWrapper: {
    width: '50%',
    paddingHorizontal: 6,
    paddingBottom: 12,
  },
  card: {
    backgroundColor: 'rgba(30,41,59,0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 130,
  },
  emojiPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
  },
  textPlaceholder: {
    width: 80,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 6,
  },
  textPlaceholderShort: {
    width: 50,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
