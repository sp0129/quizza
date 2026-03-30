import pool from '../db';

let _expo: any = null;
let _Expo: any = null;

async function getExpo() {
  if (!_expo) {
    const mod = await import('expo-server-sdk');
    _Expo = mod.Expo ?? mod.default?.Expo ?? mod.default;
    _expo = new _Expo();
  }
  return { expo: _expo, Expo: _Expo };
}

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const { expo, Expo } = await getExpo();

  if (!Expo.isExpoPushToken(pushToken)) {
    console.warn('[push] invalid token, removing:', pushToken);
    await pool.query('UPDATE users SET push_token = NULL WHERE push_token = $1', [pushToken]);
    return;
  }

  try {
    const [ticket] = await expo.sendPushNotificationsAsync([{
      to: pushToken,
      sound: 'default' as const,
      title,
      body,
      data: data ?? {},
    }]);
    if (ticket.status === 'error') {
      console.error('[push] error:', ticket.message);
      if (ticket.details?.error === 'DeviceNotRegistered') {
        await pool.query('UPDATE users SET push_token = NULL WHERE push_token = $1', [pushToken]);
      }
    }
  } catch (err) {
    console.error('[push] send failed:', err);
  }
}
