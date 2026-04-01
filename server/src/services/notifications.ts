import pool from '../db';
import https from 'https';

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!pushToken.startsWith('ExponentPushToken[')) {
    console.warn('[push] invalid token, removing:', pushToken);
    await pool.query('UPDATE users SET push_token = NULL WHERE push_token = $1', [pushToken]);
    return;
  }

  const payload = JSON.stringify({
    to: pushToken,
    sound: 'default',
    title,
    body,
    data: data ?? {},
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'exp.host',
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(responseBody);
          if (result.data?.status === 'error') {
            console.error('[push] error:', result.data.message);
            if (result.data.details?.error === 'DeviceNotRegistered') {
              pool.query('UPDATE users SET push_token = NULL WHERE push_token = $1', [pushToken]);
            }
          } else {
            console.log('[push] sent successfully');
          }
        } catch {}
        resolve();
      });
    });
    req.on('error', (err) => {
      console.error('[push] send failed:', err);
      resolve();
    });
    req.write(payload);
    req.end();
  });
}
