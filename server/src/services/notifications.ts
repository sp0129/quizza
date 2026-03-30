import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import pool from '../db';

const expo = new Expo();

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.warn('[push] invalid token, removing:', pushToken);
    await pool.query('UPDATE users SET push_token = NULL WHERE push_token = $1', [pushToken]);
    return;
  }

  const message: ExpoPushMessage = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data: data ?? {},
  };

  try {
    const [ticket] = await expo.sendPushNotificationsAsync([message]);
    if ((ticket as any).status === 'error') {
      const err = ticket as any;
      console.error('[push] error:', err.message);
      if (err.details?.error === 'DeviceNotRegistered') {
        await pool.query('UPDATE users SET push_token = NULL WHERE push_token = $1', [pushToken]);
      }
    }
  } catch (err) {
    console.error('[push] send failed:', err);
  }
}
