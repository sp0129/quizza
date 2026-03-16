import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SoundName = 'correct' | 'wrong' | 'tick' | 'celebrate' | 'tap';

const SOUND_FILES: Record<SoundName, any> = {
  correct: require('../assets/sounds/correct.wav'),
  wrong: require('../assets/sounds/wrong.wav'),
  tick: require('../assets/sounds/tick.wav'),
  celebrate: require('../assets/sounds/celebrate.wav'),
  tap: require('../assets/sounds/tap.wav'),
};

const STORAGE_KEY = 'quizza_sound_enabled';

let soundEnabled = true;
let loaded = false;
const cache: Partial<Record<SoundName, Audio.Sound>> = {};

// Load setting from storage on startup
export async function initSoundSetting(): Promise<void> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    if (val !== null) soundEnabled = val === 'true';
    loaded = true;
  } catch {
    loaded = true;
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export async function setSoundEnabled(enabled: boolean): Promise<void> {
  soundEnabled = enabled;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {}
}

export async function playSound(name: SoundName): Promise<void> {
  if (!soundEnabled) return;

  try {
    // Reuse cached sound if available, otherwise load
    let sound = cache[name];
    if (!sound) {
      const { sound: s } = await Audio.Sound.createAsync(SOUND_FILES[name]);
      cache[name] = s;
      sound = s;
    } else {
      // Reset to start for replaying
      await sound.setPositionAsync(0);
    }
    await sound.playAsync();
  } catch {
    // Silently fail — sounds are non-critical
  }
}
