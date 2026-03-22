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
              (SELECT status FROM friendships
               WHERE user_a_id = LEAST($2::uuid, id) AND user_b_id = GREATEST($2::uuid, id)
              ) AS friend_status
       FROM users
       WHERE username ILIKE $1 AND id != $2 AND is_guest = FALSE
         AND NOT EXISTS (
           SELECT 1 FROM friendships
           WHERE user_a_id = LEAST($2::uuid, id) AND user_b_id = GREATEST($2::uuid, id)
             AND status = 'accepted'
         )
       ORDER BY friend_status DESC NULLS LAST, username
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
    // Competitive stats: wins, losses, games played (only games with an opponent)
    const competitiveResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'completed') AS games_played,
         COUNT(*) FILTER (WHERE status = 'completed' AND winner_id = $1) AS wins,
         COUNT(*) FILTER (WHERE status = 'completed' AND winner_id IS NOT NULL AND winner_id != $1) AS losses
       FROM games
       WHERE (player_a_id = $1 OR player_b_id = $1)
         AND player_b_id IS NOT NULL`,
      [userId]
    );
    const gamesPlayed = parseInt(competitiveResult.rows[0].games_played) || 0;
    const totalWins = parseInt(competitiveResult.rows[0].wins) || 0;
    const totalLosses = parseInt(competitiveResult.rows[0].losses) || 0;
    const decided = totalWins + totalLosses;
    const winRate = decided > 0 ? Math.round((totalWins / decided) * 100) : 0;

    // Total stats: ALL completed games (including solo) — for new user detection + progress
    const totalResult = await pool.query(
      `SELECT
         COUNT(*) AS games_played_total,
         MAX(CASE WHEN player_a_id = $1 THEN player_a_score ELSE player_b_score END) AS best_score
       FROM games
       WHERE (player_a_id = $1 OR player_b_id = $1) AND status = 'completed'`,
      [userId]
    );
    const gamesPlayedTotal = parseInt(totalResult.rows[0].games_played_total) || 0;
    const bestScore = parseInt(totalResult.rows[0].best_score) || 0;

    // Last played category (for "Play {Category} Again" quick-action)
    const lastCategoryResult = await pool.query(
      `SELECT g.category, qs.source,
              jsonb_array_length(qs.questions) as question_count
       FROM games g
       LEFT JOIN question_sets qs ON qs.id = g.question_set_id
       WHERE (g.player_a_id = $1 OR g.player_b_id = $1) AND g.status = 'completed'
       ORDER BY g.completed_at DESC LIMIT 1`,
      [userId]
    );
    const lastPlayedCategory = lastCategoryResult.rows[0]?.category || null;
    const lastPlayedQuestionCount = lastCategoryResult.rows[0]?.question_count || null;

    // Friends count
    const friendsResult = await pool.query(
      `SELECT COUNT(*) AS count FROM friendships
       WHERE (user_a_id = $1 OR user_b_id = $1) AND status = 'accepted'`,
      [userId]
    );
    const friendsCount = parseInt(friendsResult.rows[0].count) || 0;

    // Win streak: consecutive recent competitive wins (for Profile tab)
    const recentGames = await pool.query(
      `SELECT winner_id FROM games
       WHERE (player_a_id = $1 OR player_b_id = $1)
         AND player_b_id IS NOT NULL
         AND status = 'completed'
         AND winner_id IS NOT NULL
       ORDER BY completed_at DESC
       LIMIT 50`,
      [userId]
    );
    let winStreak = 0;
    for (const row of recentGames.rows) {
      if (row.winner_id === userId) winStreak++;
      else break;
    }

    // Daily streak: consecutive days with at least one completed game (from today backward)
    const dailyDatesResult = await pool.query(
      `SELECT DISTINCT DATE(completed_at) AS play_date FROM games
       WHERE (player_a_id = $1 OR player_b_id = $1) AND status = 'completed'
       ORDER BY play_date DESC`,
      [userId]
    );
    let dailyStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const row of dailyDatesResult.rows) {
      const playDate = new Date(row.play_date);
      playDate.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - dailyStreak);
      if (playDate.getTime() === expectedDate.getTime()) {
        dailyStreak++;
      } else {
        break;
      }
    }

    // Derived stats
    const level = Math.max(1, Math.floor(gamesPlayedTotal / 5) + 1);
    const xp = gamesPlayedTotal * 10;
    const xpToNextLevel = ((level) * 5 - gamesPlayedTotal) * 10;

    res.json({
      // Competitive (standard dashboard)
      streak: dailyStreak,
      winStreak,
      wins: totalWins,
      winRate,
      // Total (new user detection + progress)
      gamesPlayedTotal,
      bestScore,
      lastPlayedCategory,
      lastPlayedQuestionCount,
      friendsCount,
      // Derived
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
       WHERE (player_a_id = $1 OR player_b_id = $1)
         AND player_b_id IS NOT NULL`,
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

// DELETE /users/me — permanently delete account and all associated data
router.delete('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.userId!;
  try {
    // Delete in dependency order
    await pool.query('DELETE FROM open_challenge_submissions WHERE user_id = $1', [me]);
    await pool.query('DELETE FROM open_challenges WHERE posted_by_user_id = $1', [me]);
    await pool.query('DELETE FROM room_answers WHERE player_id = $1', [me]);
    await pool.query('DELETE FROM room_players WHERE player_id = $1', [me]);
    await pool.query('DELETE FROM game_answers WHERE player_id = $1', [me]);
    await pool.query('DELETE FROM invitations WHERE inviter_id = $1 OR invitee_id = $1', [me]);
    await pool.query('DELETE FROM games WHERE player_a_id = $1 OR player_b_id = $1', [me]);
    await pool.query('DELETE FROM friendships WHERE user_a_id = $1 OR user_b_id = $1', [me]);
    await pool.query('DELETE FROM matchmaking_queue WHERE user_id = $1', [me]);
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [me]);
    await pool.query('DELETE FROM verification_tokens WHERE user_id = $1', [me]);
    await pool.query('DELETE FROM users WHERE id = $1', [me]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
