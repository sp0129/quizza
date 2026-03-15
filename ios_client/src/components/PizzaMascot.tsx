import React from 'react';
import { Image, StyleSheet } from 'react-native';

export type MascotMood = 'excited' | 'idle' | 'happy' | 'thinking' | 'celebrating' | 'wrong';

const MOOD_IMAGES: Record<MascotMood, any> = {
  idle: require('../assets/mascot/idle.png'),
  happy: require('../assets/mascot/happy.png'),
  excited: require('../assets/mascot/excited.png'),
  thinking: require('../assets/mascot/thinking.png'),
  celebrating: require('../assets/mascot/celebrating.png'),
  wrong: require('../assets/mascot/wrong.png'),
};

interface Props {
  mood?: MascotMood;
  size?: number;
}

export default function PizzaMascot({ mood = 'idle', size = 120 }: Props) {
  return (
    <Image
      source={MOOD_IMAGES[mood]}
      style={[styles.image, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  image: {},
});
