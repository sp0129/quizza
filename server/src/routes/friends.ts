import { Router, Response } from 'express';
import pool from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /friends — list my friends
router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.profile_picture_url
       FROM friendships f
       JOIN users u ON u.id = CASE
         WHEN f.user_a_id = $1 THEN f.user_b_id
         ELSE f.user_a_id
       END
       WHERE f.user_a_id = $1 OR f.user_b_id = $1
       ORDER BY u.username`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /friends — add friend by username (direct, no request flow)
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { username } = req.body;
  if (!username) { res.status(400).json({ error: 'username required' }); return; }
  try {
    const found = await pool.query(
      `SELECT id FROM users WHERE username = $1 AND id != $2`,
      [username, req.userId]
    );
    if (!found.rows[0]) { res.status(404).json({ error: 'User not found' }); return; }

    const friendId = found.rows[0].id;
    const [a, b] = [req.userId!, friendId].sort();

    await pool.query(
      `INSERT INTO friendships (user_a_id, user_b_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [a, b]
    );
    res.json({ success: true, friendId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /friends/by-id — add friend by userId (for post-room flow)
router.post('/by-id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId: friendId } = req.body;
  if (!friendId || friendId === req.userId) { res.status(400).json({ error: 'invalid userId' }); return; }
  try {
    const [a, b] = [req.userId!, friendId].sort();
    await pool.query(
      `INSERT INTO friendships (user_a_id, user_b_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [a, b]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /friends/:userId — unfriend
router.delete('/:friendUserId', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { friendUserId } = req.params;
  try {
    const [a, b] = [req.userId!, friendUserId].sort();
    await pool.query(
      `DELETE FROM friendships WHERE user_a_id = $1 AND user_b_id = $2`,
      [a, b]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
