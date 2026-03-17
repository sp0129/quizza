import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'quizza_game_preferences';

export interface GamePreferences {
  timer: 15 | 30;
  questionCount: 5 | 10;
  difficulty: 'all' | 'easy' | 'medium' | 'hard';
}

export const DEFAULT_PREFERENCES: GamePreferences = {
  timer: 30,
  questionCount: 10,
  difficulty: 'all',
};

export async function getGamePreferences(): Promise<GamePreferences> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function saveGamePreferences(prefs: Partial<GamePreferences>): Promise<GamePreferences> {
  const current = await getGamePreferences();
  const updated = { ...current, ...prefs };
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
}
