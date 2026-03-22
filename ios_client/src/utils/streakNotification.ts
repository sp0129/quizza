import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_NOTIF_KEY = 'quizza_streak_notif_scheduled';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  } as Notifications.NotificationBehavior),
});

/**
 * Schedule a local notification for tonight at 8 PM if the user has an active streak.
 * Called when the app goes to background. Cancels any previously scheduled streak notification.
 */
export async function scheduleStreakReminder(currentStreak: number): Promise<void> {
  if (currentStreak < 1) return;

  try {
    // Request permission (only prompts once, iOS remembers the answer)
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    // Cancel any existing streak notification
    await cancelStreakReminder();

    // Schedule for 8 PM today (or tomorrow if it's already past 8 PM)
    const now = new Date();
    const tonight = new Date();
    tonight.setHours(20, 0, 0, 0);
    if (now >= tonight) {
      tonight.setDate(tonight.getDate() + 1);
    }

    const secondsUntil = Math.max(60, Math.floor((tonight.getTime() - now.getTime()) / 1000));

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 Your streak is on the line!',
        body: currentStreak === 1
          ? 'Play one game today to keep your streak alive.'
          : `Your ${currentStreak}-day streak ends tonight. One game keeps it going.`,
        sound: true,
      },
      trigger: { seconds: secondsUntil, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
    });

    await AsyncStorage.setItem(STREAK_NOTIF_KEY, id);
  } catch {}
}

/**
 * Cancel any pending streak reminder. Called when the user plays a game today.
 */
export async function cancelStreakReminder(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(STREAK_NOTIF_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(STREAK_NOTIF_KEY);
    }
  } catch {}
}
