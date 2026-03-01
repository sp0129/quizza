import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /users/:username — public profile + stats
router.get('/:username', async (req: Request, res: Response): Promise<void> => {
  try {
    const userResult = await pool.query(
      `SELECT id, username, profile_picture_url, created_at FROM users WHERE username = $1`,
      [req.params.username]
    );
    const user = userResult.rows[0];
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const statsResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'completed') AS games_played,
         COUNT(*) FILTER (WHERE status = 'completed' AND winner_id = $1) AS wins,
         COUNT(*) FILTER (WHERE status = 'completed' AND winner_id IS NOT NULL AND winner_id != $1) AS losses,
         ROUND(AVG(CASE WHEN player_a_id = $1 THEN player_a_score ELSE player_b_score END)
               FILTER (WHERE status = 'completed'), 1) AS avg_score
       FROM games
       WHERE player_a_id = $1 OR player_b_id = $1`,
      [user.id]
    );

    res.json({ ...user, stats: statsResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /users/:userId — update own profile
router.put('/:userId', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.params.userId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  const { profilePictureUrl, phoneNumber } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET profile_picture_url = COALESCE($1, profile_picture_url),
                        phone_number = COALESCE($2, phone_number),
                        updated_at = NOW()
       WHERE id = $3
       RETURNING id, username, email, phone_number, profile_picture_url`,
      [profilePictureUrl ?? null, phoneNumber ?? null, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
