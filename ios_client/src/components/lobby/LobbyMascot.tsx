import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const LOTTIE_SOURCES = [
  require('../../assets/lottie/lobby-1.lottie'),
  require('../../assets/lottie/lobby-2.lottie'),
  require('../../assets/lottie/lobby-3.lottie'),
  require('../../assets/lottie/lobby-4.lottie'),
];

interface Props {
  size?: number;
}

export default function LobbyMascot({ size = 140 }: Props) {
  // Pick one randomly on mount — useMemo ensures it stays stable for the component lifetime
  const source = useMemo(
    () => LOTTIE_SOURCES[Math.floor(Math.random() * LOTTIE_SOURCES.length)],
    [],
  );

  return (
    <View style={styles.container}>
      <LottieView
        source={source}
        autoPlay
        loop
        style={{ width: size, height: size }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
