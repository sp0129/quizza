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

export default router;
