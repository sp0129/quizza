import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import pool from '../db';

// Verify an Apple identity token using Apple's public JWKS
async function verifyAppleToken(token: string): Promise<{ sub: string; email?: string }> {
  const keysRes = await fetch('https://appleid.apple.com/auth/keys');
  const { keys } = await keysRes.json() as { keys: object[] };
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string') throw new Error('Invalid token');
  const kid = (decoded.header as any).kid;
  const appleKey = (keys as any[]).find(k => k.kid === kid);
  if (!appleKey) throw new Error('Apple key not found');
  const publicKey = crypto.createPublicKey({ key: appleKey, format: 'jwk' });
  const pem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  return jwt.verify(token, pem, {
    algorithms: ['RS256'],
    issuer: 'https://appleid.apple.com',
    audience: process.env.APPLE_APP_ID ?? 'com.quizza.app',
  }) as { sub: string; email?: string };
}

function buildAppleUsername(
  fullName: { givenName?: string; familyName?: string } | null,
  email: string | undefined,
  userId: string,
): string {
  let base = '';
  if (fullName?.givenName) {
    base = (fullName.givenName + (fullName.familyName?.[0] ?? '')).replace(/[^a-zA-Z0-9]/g, '');
  } else if (email) {
    base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
  }
  base = base.slice(0, 12) || 'Player';
  return base + '_' + userId.slice(0, 4);
}

const router = Router();

router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: 'username, email, and password are required' });
    return;
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (id, username, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, created_at`,
      [uuidv4(), username, email, passwordHash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username or email already taken' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }
  try {
    const result = await pool.query(
      'SELECT id, username, email, password_hash, created_at FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (_req: Request, res: Response): void => {
  // JWT is stateless — client drops the token. Nothing to do server-side.
  res.json({ message: 'Logged out' });
});

// POST /auth/guest — create a one-time guest account for room join links.
// No password required; the account gets a random unusable password hash.
router.post('/guest', async (req: Request, res: Response): Promise<void> => {
  let { username } = req.body;
  if (!username || typeof username !== 'string') {
    res.status(400).json({ error: 'username is required' });
    return;
  }
  username = username.trim().slice(0, 30);
  if (!username) {
    res.status(400).json({ error: 'username cannot be empty' });
    return;
  }

  const id = uuidv4();
  // Use a UUID-based internal username to guarantee uniqueness; the chosen
  // display name is stored in room_players separately and returned to the client.
  const internalUsername = `guest_${id.slice(0, 8)}`;
  const email = `guest_${id}@guest.local`;
  const passwordHash = uuidv4();

  try {
    // Ensure column exists (idempotent — safe if migration already ran)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT FALSE`);
    const result = await pool.query(
      `INSERT INTO users (id, username, email, password_hash, is_guest)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, email, created_at`,
      [id, internalUsername, email, passwordHash]
    );
    const row = result.rows[0];
    const token = jwt.sign({ userId: row.id }, process.env.JWT_SECRET!, { expiresIn: '24h' });
    res.status(201).json({ token, user: { ...row, username, is_guest: true } });
    return;
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
    return;
  }
});

// POST /auth/apple — Sign in with Apple (iOS)
router.post('/apple', async (req: Request, res: Response): Promise<void> => {
  const { identityToken, fullName } = req.body;
  if (!identityToken) { res.status(400).json({ error: 'identityToken required' }); return; }
  try {
    const claims = await verifyAppleToken(identityToken);
    const appleId = claims.sub;

    // Return existing user if already linked
    const existing = await pool.query(
      `SELECT id, username, email, is_guest FROM users WHERE apple_id = $1`,
      [appleId]
    );
    if (existing.rows.length > 0) {
      const u = existing.rows[0];
      const token = jwt.sign({ userId: u.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
      res.json({ token, user: u });
      return;
    }

    // Create new user
    const userId = uuidv4();
    const username = buildAppleUsername(fullName ?? null, claims.email, userId);
    const userEmail = claims.email ?? `apple_${appleId.slice(0, 8)}@apple.local`;

    const inserted = await pool.query(
      `INSERT INTO users (id, username, email, password_hash, apple_id, is_guest)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       ON CONFLICT (apple_id) DO UPDATE SET apple_id = EXCLUDED.apple_id
       RETURNING id, username, email, is_guest`,
      [userId, username, userEmail, uuidv4(), appleId]
    );
    const newUser = inserted.rows[0];
    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
    res.status(201).json({ token, user: newUser });
  } catch (err: any) {
    console.error('Apple auth error:', err);
    if (err.code === '23505') res.status(409).json({ error: 'Account already exists' });
    else res.status(401).json({ error: 'Apple authentication failed' });
  }
});

// POST /auth/reset-password — reset password by email (no token verification)
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    res.status(400).json({ error: 'email and newPassword are required' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }
  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No account found with that email' });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2', [passwordHash, email.toLowerCase()]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
