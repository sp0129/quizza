import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';

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
    const result = await pool.query(
      `INSERT INTO users (id, username, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, created_at`,
      [id, internalUsername, email, passwordHash]
    );
    const row = result.rows[0];
    const token = jwt.sign({ userId: row.id }, process.env.JWT_SECRET!, { expiresIn: '24h' });
    // Return the chosen display name as username so the client stores it correctly
    res.status(201).json({ token, user: { ...row, username } });
    return;
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
    return;
  }
});

export default router;
