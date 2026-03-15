import { Router, Response } from 'express';
import pool from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /friends — list my friends
router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_id
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

// GET /friends/:friendId/history — head-to-head stats + recent games
router.get('/:friendId/history', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.userId!;
  const friend = req.params.friendId;
  try {
    // Verify friendship exists and get created_at
    const [a, b] = [me, friend].sort();
    const friendship = await pool.query(
      `SELECT created_at FROM friendships WHERE user_a_id = $1::uuid AND user_b_id = $2::uuid`,
      [a, b]
    );
    if (!friendship.rows[0]) { res.status(404).json({ error: 'Not friends' }); return; }

    // Head-to-head stats (all time)
    const statsResult = await pool.query(
      `SELECT
        COUNT(*) AS total_games,
        COUNT(*) FILTER (WHERE winner_id = $1) AS wins,
        COUNT(*) FILTER (WHERE winner_id = $2) AS losses,
        COUNT(*) FILTER (WHERE winner_id IS NULL) AS ties
      FROM games
      WHERE status = 'completed'
        AND ((player_a_id = $1 AND player_b_id = $2) OR (player_a_id = $2 AND player_b_id = $1))`,
      [me, friend]
    );
    const s = statsResult.rows[0];
    const wins = parseInt(s.wins);
    const losses = parseInt(s.losses);
    const decided = wins + losses;

    // Recent games (last 15)
    const gamesResult = await pool.query(
      `SELECT
        g.id,
        g.category,
        CASE WHEN g.player_a_id = $1 THEN g.player_a_score ELSE g.player_b_score END AS my_score,
        CASE WHEN g.player_a_id = $1 THEN g.player_b_score ELSE g.player_a_score END AS opponent_score,
        g.winner_id,
        g.completed_at
      FROM games g
      WHERE g.status = 'completed'
        AND ((g.player_a_id = $1 AND g.player_b_id = $2) OR (g.player_a_id = $2 AND g.player_b_id = $1))
      ORDER BY g.completed_at DESC
      LIMIT 15`,
      [me, friend]
    );

    res.json({
      friendsSince: friendship.rows[0].created_at,
      stats: {
        totalGames: parseInt(s.total_games),
        wins,
        losses,
        ties: parseInt(s.ties),
        winRate: decided > 0 ? Math.round((wins / decided) * 100) : 0,
      },
      games: gamesResult.rows.map(row => ({
        id: row.id,
        category: row.category,
        myScore: parseInt(row.my_score),
        opponentScore: parseInt(row.opponent_score),
        won: row.winner_id === me,
        tied: row.winner_id === null,
        completedAt: row.completed_at,
      })),
    });
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
