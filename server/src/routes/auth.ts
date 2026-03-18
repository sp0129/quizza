import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import pool from '../db';
import { generateToken, hashToken } from '../utils/tokens';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordResetConfirmation,
} from '../services/email';

// ─── Apple auth helpers ──────────────────────────────────────────────

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
  // Log the audience Apple actually sent so we can diagnose mismatches
  const payload = (decoded as any).payload;
  if (payload?.aud) console.log('Apple token audience:', payload.aud);
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

// ─── In-memory rate-limit tracker for forgot-password ────────────────

const forgotPasswordAttempts = new Map<string, { count: number; windowStart: number }>();
const FORGOT_RATE_LIMIT = 5;
const FORGOT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isForgotRateLimited(email: string): boolean {
  const key = email.toLowerCase();
  const now = Date.now();
  const entry = forgotPasswordAttempts.get(key);
  if (!entry || now - entry.windowStart > FORGOT_WINDOW_MS) {
    forgotPasswordAttempts.set(key, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > FORGOT_RATE_LIMIT;
}

// ─── Router ──────────────────────────────────────────────────────────

const router = Router();

// ── POST /auth/signup ────────────────────────────────────────────────

router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: 'username, email, and password are required' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    await pool.query(
      `INSERT INTO users (id, username, email, password_hash, is_verified)
       VALUES ($1, $2, $3, $4, FALSE)`,
      [userId, username, email.toLowerCase(), passwordHash]
    );

    // Generate verification token
    const rawToken = generateToken();
    const hashed = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await pool.query(
      `INSERT INTO verification_tokens (user_id, hashed_token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, hashed, expiresAt]
    );

    // Send verification email (fire-and-forget so signup isn't blocked)
    sendVerificationEmail(email.toLowerCase(), rawToken).catch(err =>
      console.error('Failed to send verification email:', err)
    );

    res.status(201).json({
      message: `Verification email sent to ${email}. Check your inbox.`,
      email: email.toLowerCase(),
    });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username or email already taken' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// ── POST /auth/verify-email ──────────────────────────────────────────

router.post('/verify-email', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: 'Token is required' });
    return;
  }
  try {
    const hashed = hashToken(token);
    const result = await pool.query(
      `SELECT vt.id, vt.user_id, vt.expires_at, vt.used
       FROM verification_tokens vt
       WHERE vt.hashed_token = $1`,
      [hashed]
    );
    const row = result.rows[0];
    if (!row || row.used || new Date(row.expires_at) < new Date()) {
      res.status(400).json({ error: 'This verification link is invalid or has expired.' });
      return;
    }

    // Mark token as used + user as verified
    await pool.query(`UPDATE verification_tokens SET used = TRUE WHERE id = $1`, [row.id]);
    await pool.query(
      `UPDATE users SET is_verified = TRUE, verified_at = NOW() WHERE id = $1`,
      [row.user_id]
    );

    res.json({ message: 'Email verified! You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /auth/resend-verification ───────────────────────────────────

router.post('/resend-verification', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  try {
    const userResult = await pool.query(
      `SELECT id, is_verified FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    const user = userResult.rows[0];

    // Always return success to prevent email enumeration
    if (!user || user.is_verified) {
      res.json({ message: 'If an unverified account exists, a new verification email was sent.' });
      return;
    }

    // Invalidate old tokens
    await pool.query(
      `UPDATE verification_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
      [user.id]
    );

    const rawToken = generateToken();
    const hashed = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO verification_tokens (user_id, hashed_token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, hashed, expiresAt]
    );

    sendVerificationEmail(email.toLowerCase(), rawToken).catch(err =>
      console.error('Failed to send verification email:', err)
    );

    res.json({ message: 'If an unverified account exists, a new verification email was sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /auth/login ─────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }
  try {
    const result = await pool.query(
      'SELECT id, username, email, password_hash, avatar_id, is_verified, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
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

    if (!user.is_verified) {
      res.status(403).json({
        error: 'Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
      return;
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    const { password_hash, is_verified, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /auth/forgot-password ───────────────────────────────────────

router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  // Rate limit
  if (isForgotRateLimited(email)) {
    // Still return generic message — don't reveal rate limit to attacker
    res.json({ message: 'If an account exists with that email, a reset link was sent.' });
    return;
  }

  try {
    const userResult = await pool.query(
      `SELECT id, is_verified FROM users WHERE email = $1 AND is_guest = FALSE`,
      [email.toLowerCase()]
    );
    const user = userResult.rows[0];

    // Always return the same message regardless of whether user exists
    if (!user || !user.is_verified) {
      res.json({ message: 'If an account exists with that email, a reset link was sent.' });
      return;
    }

    // Invalidate old unused reset tokens for this user
    await pool.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
      [user.id]
    );

    const rawToken = generateToken();
    const hashed = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, hashed_token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, hashed, expiresAt]
    );

    sendPasswordResetEmail(email.toLowerCase(), rawToken).catch(err =>
      console.error('Failed to send reset email:', err)
    );

    res.json({ message: 'If an account exists with that email, a reset link was sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /auth/reset-password ────────────────────────────────────────

router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    res.status(400).json({ error: 'Token and new password are required' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  try {
    const hashed = hashToken(token);
    const result = await pool.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, prt.attempts,
              u.email
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.hashed_token = $1`,
      [hashed]
    );
    const row = result.rows[0];

    // Generic error for any invalid state
    if (!row || row.used || new Date(row.expires_at) < new Date() || row.attempts >= 5) {
      res.status(400).json({ error: 'This reset link is invalid or has expired. Please try again.' });
      return;
    }

    // Increment attempts
    await pool.query(
      `UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = $1`,
      [row.id]
    );

    // Hash new password and update user
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, row.user_id]
    );

    // Mark token as used
    await pool.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`,
      [row.id]
    );

    // Send confirmation email
    sendPasswordResetConfirmation(row.email).catch(err =>
      console.error('Failed to send reset confirmation:', err)
    );

    res.json({ message: 'Password reset successfully! Log in with your new password.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /auth/logout ────────────────────────────────────────────────

router.post('/logout', (_req: Request, res: Response): void => {
  res.json({ message: 'Logged out' });
});

// ── POST /auth/guest ─────────────────────────────────────────────────

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
  const internalUsername = `guest_${id.slice(0, 8)}`;
  const email = `guest_${id}@guest.local`;
  const passwordHash = uuidv4();

  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT FALSE`);
    const result = await pool.query(
      `INSERT INTO users (id, username, email, password_hash, is_guest, is_verified)
       VALUES ($1, $2, $3, $4, TRUE, TRUE)
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

// ── POST /auth/apple ─────────────────────────────────────────────────

router.post('/apple', async (req: Request, res: Response): Promise<void> => {
  const { identityToken, fullName } = req.body;
  if (!identityToken) { res.status(400).json({ error: 'identityToken required' }); return; }
  try {
    const claims = await verifyAppleToken(identityToken);
    const appleId = claims.sub;

    const existing = await pool.query(
      `SELECT id, username, email, avatar_id, is_guest FROM users WHERE apple_id = $1`,
      [appleId]
    );
    if (existing.rows.length > 0) {
      const u = existing.rows[0];
      const token = jwt.sign({ userId: u.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
      res.json({ token, user: u });
      return;
    }

    const userId = uuidv4();
    const username = buildAppleUsername(fullName ?? null, claims.email, userId);
    const userEmail = claims.email ?? `apple_${appleId.slice(0, 8)}@apple.local`;

    const inserted = await pool.query(
      `INSERT INTO users (id, username, email, password_hash, apple_id, is_guest, is_verified)
       VALUES ($1, $2, $3, $4, $5, FALSE, TRUE)
       ON CONFLICT (apple_id) DO UPDATE SET apple_id = EXCLUDED.apple_id
       RETURNING id, username, email, avatar_id, is_guest`,
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

export default router;
