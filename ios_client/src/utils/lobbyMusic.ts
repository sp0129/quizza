import { Audio } from 'expo-av';
import { isSoundEnabled } from './sounds';

let musicSound: Audio.Sound | null = null;
let cancelled = false;

export async function startLobbyMusic(): Promise<void> {
  if (!isSoundEnabled()) return;
  cancelled = false;
  try {
    // Don't restart if already playing
    if (musicSound) {
      const status = await musicSound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) return;
    }
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/lobby-music.mp3'),
      { isLooping: true, volume: 0.25 },
    );
    // Stop was called while we were loading — discard the sound
    if (cancelled) {
      await sound.unloadAsync();
      return;
    }
    musicSound = sound;
    await sound.playAsync();
  } catch {}
}

export async function stopLobbyMusic(): Promise<void> {
  cancelled = true;
  try {
    if (musicSound) {
      await musicSound.stopAsync();
      await musicSound.unloadAsync();
      musicSound = null;
    }
  } catch {
    musicSound = null;
  }
}
