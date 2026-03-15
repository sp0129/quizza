import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /users/search?q= — search users by username prefix (authenticated)
// IMPORTANT: Must be defined BEFORE /:username to avoid being swallowed by the wildcard
router.get('/search', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  let q = (req.query.q as string ?? '').trim();
  // Strip leading @ if user types "@username"
  if (q.startsWith('@')) q = q.slice(1);
  if (q.length < 1) { res.json([]); return; }
  try {
    const result = await pool.query(
      `SELECT id, username, avatar_id,
              EXISTS (
                SELECT 1 FROM friendships
                WHERE (user_a_id = LEAST($2::uuid, id) AND user_b_id = GREATEST($2::uuid, id))
              ) AS is_friend
       FROM users
       WHERE username ILIKE $1 AND id != $2 AND is_guest = FALSE
       ORDER BY is_friend DESC, username
       LIMIT 10`,
      [q + '%', req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /users/me/stats — authenticated user's dashboard metrics
router.get('/me/stats', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  try {
    // Core stats: wins, losses, games played
    const statsResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'completed') AS games_played,
         COUNT(*) FILTER (WHERE status = 'completed' AND winner_id = $1) AS wins,
         COUNT(*) FILTER (WHERE status = 'completed' AND winner_id IS NOT NULL AND winner_id != $1) AS losses
       FROM games
       WHERE player_a_id = $1 OR player_b_id = $1`,
      [userId]
    );
    const { games_played, wins, losses } = statsResult.rows[0];
    const gamesPlayed = parseInt(games_played) || 0;
    const totalWins = parseInt(wins) || 0;
    const totalLosses = parseInt(losses) || 0;
    const decided = totalWins + totalLosses;
    const winRate = decided > 0 ? Math.round((totalWins / decided) * 100) : 0;

    // Win streak: count consecutive recent wins
    const recentGames = await pool.query(
      `SELECT winner_id FROM games
       WHERE (player_a_id = $1 OR player_b_id = $1)
         AND status = 'completed'
         AND winner_id IS NOT NULL
       ORDER BY completed_at DESC
       LIMIT 50`,
      [userId]
    );
    let streak = 0;
    for (const row of recentGames.rows) {
      if (row.winner_id === userId) streak++;
      else break;
    }

    // Derived stats
    const level = Math.max(1, Math.floor(gamesPlayed / 5) + 1);
    const xp = gamesPlayed * 10;
    const xpToNextLevel = ((level) * 5 - gamesPlayed) * 10;

    res.json({
      streak,
      wins: totalWins,
      winRate,
      level,
      gems: totalWins * 5,
      xp,
      xpToNextLevel: Math.max(xpToNextLevel, 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /users/:username — public profile + stats
router.get('/:username', async (req: Request, res: Response): Promise<void> => {
  try {
    const userResult = await pool.query(
      `SELECT id, username, avatar_id, created_at FROM users WHERE username = $1`,
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

// PUT /users/me — update own profile (username, avatarId)
router.put('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { username, avatarId } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users
       SET username = COALESCE($1, username),
           avatar_id = COALESCE($2, avatar_id),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, username, email, avatar_id, is_guest`,
      [username ?? null, avatarId ?? null, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') res.status(409).json({ error: 'Username already taken' });
    else { console.error(err); res.status(500).json({ error: 'Server error' }); }
  }
});

// PUT /users/:userId — legacy update (kept for compatibility)
router.put('/:userId', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.params.userId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  const { avatarId, phoneNumber } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET avatar_id = COALESCE($1, avatar_id),
                        phone_number = COALESCE($2, phone_number),
                        updated_at = NOW()
       WHERE id = $3
       RETURNING id, username, email, phone_number, avatar_id`,
      [avatarId ?? null, phoneNumber ?? null, req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
