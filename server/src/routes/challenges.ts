import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { fetchAndStoreQuestionSet } from '../services/questions';

const router = Router();
const CHALLENGE_EXPIRY_HOURS = 24;

// POST /challenges — send a challenge invitation to a user by username
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { targetUsername, category, categoryId, questionCount } = req.body;
  const me = req.userId!;

  if (!targetUsername || !category) {
    res.status(400).json({ error: 'targetUsername and category are required' });
    return;
  }

  try {
    // Find target user
    const targetResult = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [targetUsername]
    );
    if (!targetResult.rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const targetId: string = targetResult.rows[0].id;

    if (targetId === me) {
      res.status(400).json({ error: 'Cannot challenge yourself' });
      return;
    }

    const count = Number(questionCount) === 5 ? 5 : 10;
    const questionSetId = await fetchAndStoreQuestionSet(category, categoryId, count);
    const gameId = uuidv4();
    const invId = uuidv4();
    const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_HOURS * 3_600_000);

    await pool.query(
      `INSERT INTO games (id, question_set_id, player_a_id, category, game_mode, status, expires_at)
       VALUES ($1, $2, $3, $4, 'async', 'waiting', $5)`,
      [gameId, questionSetId, me, category, expiresAt]
    );

    await pool.query(
      `INSERT INTO invitations (id, inviter_id, invitee_id, category, game_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [invId, me, targetId, category, gameId, expiresAt]
    );

    res.json({ gameId, questionSetId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /challenges/incoming — pending invitations for me
router.get('/incoming', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT i.id, i.category, i.game_id, i.expires_at, u.username AS inviter_username
       FROM invitations i
       JOIN users u ON u.id = i.inviter_id
       WHERE i.invitee_id = $1
         AND i.status = 'pending'
         AND i.expires_at > NOW()
       ORDER BY i.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /challenges/completed — challenges I sent or received that are now finished
router.get('/completed', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.userId!;
    const result = await pool.query(
      `SELECT i.id, i.category, i.game_id,
              i.inviter_id, i.invitee_id,
              i.inviter_seen, i.invitee_seen,
              g.player_a_score, g.player_b_score, g.winner_id, g.completed_at,
              g.player_a_id, g.player_b_id,
              inviter.username AS inviter_username,
              invitee.username AS invitee_username
       FROM invitations i
       JOIN games g ON g.id = i.game_id
       JOIN users inviter ON inviter.id = i.inviter_id
       JOIN users invitee ON invitee.id = i.invitee_id
       WHERE (i.inviter_id = $1 OR i.invitee_id = $1)
         AND g.status = 'completed'
       ORDER BY g.completed_at DESC
       LIMIT 20`,
      [me]
    );
    // Map results to include opponent info relative to the requesting user
    const mapped = result.rows.map(r => {
      const iAmInviter = r.player_a_id === me;
      const iAmTheInviter = r.inviter_id === me;
      return {
        id: r.id,
        gameId: r.game_id,
        category: r.category,
        myScore: iAmInviter ? r.player_a_score : r.player_b_score,
        opponentScore: iAmInviter ? r.player_b_score : r.player_a_score,
        opponentUsername: iAmInviter ? r.invitee_username : r.inviter_username,
        won: r.winner_id === me,
        tied: r.winner_id === null && r.player_a_score !== null && r.player_b_score !== null,
        completedAt: r.completed_at,
        seen: iAmTheInviter ? r.inviter_seen : r.invitee_seen,
      };
    });
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /challenges/outgoing — challenges I sent, waiting for opponent OR ready (opponent finished)
router.get('/outgoing', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.userId!;
    const result = await pool.query(
      `SELECT i.id, i.category, i.game_id, i.created_at, i.expires_at,
              i.inviter_seen,
              g.status AS game_status,
              g.player_a_score, g.player_b_score, g.winner_id, g.completed_at,
              invitee.username AS opponent_username
       FROM invitations i
       JOIN games g ON g.id = i.game_id
       JOIN users invitee ON invitee.id = i.invitee_id
       WHERE i.inviter_id = $1
         AND i.expires_at > NOW()
         AND g.status IN ('waiting', 'active', 'completed')
       ORDER BY i.created_at DESC
       LIMIT 20`,
      [me]
    );

    const mapped = result.rows.map(r => {
      const isCompleted = r.game_status === 'completed';
      return {
        id: r.id,
        gameId: r.game_id,
        category: r.category,
        opponentUsername: r.opponent_username,
        status: isCompleted ? 'completed' : 'waiting',
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        // Only include scores if completed
        ...(isCompleted ? {
          myScore: r.player_a_score,
          opponentScore: r.player_b_score,
          won: r.winner_id === me,
          tied: r.winner_id === null && r.player_a_score !== null && r.player_b_score !== null,
          completedAt: r.completed_at,
          seen: r.inviter_seen,
        } : {}),
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /challenges/:invitationId/accept
router.post('/:invitationId/accept', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.userId!;
  const { invitationId } = req.params;

  try {
    const invResult = await pool.query(
      `SELECT i.*, g.question_set_id, g.category
       FROM invitations i
       JOIN games g ON g.id = i.game_id
       WHERE i.id = $1 AND i.invitee_id = $2 AND i.status = 'pending' AND i.expires_at > NOW()`,
      [invitationId, me]
    );
    const inv = invResult.rows[0];
    if (!inv) {
      res.status(404).json({ error: 'Invitation not found or already used' });
      return;
    }

    await pool.query(
      `UPDATE games SET player_b_id = $1, status = 'active' WHERE id = $2`,
      [me, inv.game_id]
    );

    await pool.query(
      `UPDATE invitations SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
      [invitationId]
    );

    res.json({ gameId: inv.game_id, questionSetId: inv.question_set_id, category: inv.category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /challenges/:id/seen — mark a challenge result as seen by the current user
router.post('/:id/seen', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.userId!;
  const { id } = req.params;

  try {
    // Update both columns in one query — only the matching one will change
    const result = await pool.query(
      `UPDATE invitations
       SET inviter_seen = CASE WHEN inviter_id = $2 THEN TRUE ELSE inviter_seen END,
           invitee_seen = CASE WHEN invitee_id = $2 THEN TRUE ELSE invitee_seen END
       WHERE id = $1::uuid AND (inviter_id = $2 OR invitee_id = $2)`,
      [id, me]
    );
    console.log('[seen]', { id, me, rowCount: result.rowCount });
    res.json({ ok: true });
  } catch (err) {
    console.error('[seen] error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
