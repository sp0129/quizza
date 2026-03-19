import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const CHALLENGE_EXPIRY_DAYS = 7;

// POST / — Create an open challenge from a completed solo game
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.userId!;
  const { question_set_id, category, mode, correct_count, total_score, time_seconds } = req.body;

  if (!question_set_id || !category || !mode) {
    res.status(400).json({ error: 'question_set_id, category, and mode are required' });
    return;
  }
  if (mode !== '5Q' && mode !== '10Q') {
    res.status(400).json({ error: 'mode must be "5Q" or "10Q"' });
    return;
  }
  if (correct_count == null || total_score == null || time_seconds == null) {
    res.status(400).json({ error: 'correct_count, total_score, and time_seconds are required' });
    return;
  }

  try {
    // Verify question set exists
    const qsResult = await pool.query('SELECT id FROM question_sets WHERE id = $1', [question_set_id]);
    if (!qsResult.rows[0]) {
      res.status(404).json({ error: 'Question set not found' });
      return;
    }

    // Look up poster's username
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [me]);
    const username: string = userResult.rows[0].username;

    const challengeId = uuidv4();
    const submissionId = uuidv4();
    const totalQuestions = mode === '5Q' ? 5 : 10;
    const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_DAYS * 24 * 3_600_000);

    // Create the challenge
    const challengeResult = await pool.query(
      `INSERT INTO open_challenges (id, posted_by_user_id, posted_by_username, category, mode, question_set_id, expires_at, player_count, high_score, high_score_username)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $3)
       RETURNING *`,
      [challengeId, me, username, category, mode, question_set_id, expiresAt, total_score]
    );

    // Insert poster's own submission (they already played)
    await pool.query(
      `INSERT INTO open_challenge_submissions (id, challenge_id, user_id, username, correct_count, total_questions, total_score, time_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [submissionId, challengeId, me, username, correct_count, totalQuestions, total_score, time_seconds]
    );

    res.status(201).json(challengeResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET / — Browse open challenges with sorting, filtering, pagination
router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.userId!;
  const sort = req.query.sort === 'newest' ? 'newest' : 'most_played';
  const category = req.query.category as string | undefined;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 50);
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

  try {
    const params: (string | number)[] = [me];
    let paramIdx = 2;
    const conditions = ['oc.is_visible = TRUE', 'oc.expires_at > NOW()'];

    if (category) {
      conditions.push(`oc.category = $${paramIdx}`);
      params.push(category);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');
    const orderBy = sort === 'newest'
      ? 'oc.posted_at DESC'
      : 'oc.player_count DESC, oc.posted_at DESC';

    // Main query with user's score via LEFT JOIN
    const query = `
      SELECT oc.*, ocs.total_score AS user_score, ocs.correct_count AS user_correct_count
      FROM open_challenges oc
      LEFT JOIN open_challenge_submissions ocs ON ocs.challenge_id = oc.id AND ocs.user_id = $1
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    params.push(limit, offset);

    // Count query (same filters, no pagination)
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM open_challenges oc
      WHERE ${whereClause}
    `;
    // Count query uses same params except $1 (user_id) and without limit/offset
    const countParams = category ? [category] : [];
    const countConditions = ['oc.is_visible = TRUE', 'oc.expires_at > NOW()'];
    if (category) countConditions.push('oc.category = $1');
    const countWhere = countConditions.join(' AND ');
    const countSql = `SELECT COUNT(*) AS total FROM open_challenges oc WHERE ${countWhere}`;

    const [challengesResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countSql, countParams),
    ]);

    const totalCount = parseInt(countResult.rows[0].total);
    res.json({
      challenges: challengesResult.rows,
      total_count: totalCount,
      has_more: offset + challengesResult.rows.length < totalCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /mine — Challenges posted by the current user with their stats
router.get('/mine', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.userId!;

  try {
    const result = await pool.query(
      `SELECT oc.*,
              ocs.total_score AS user_score,
              ocs.correct_count AS user_correct_count,
              (SELECT COUNT(*) + 1 FROM open_challenge_submissions ocs2
               WHERE ocs2.challenge_id = oc.id AND ocs2.is_visible = TRUE
                 AND (ocs2.total_score > ocs.total_score
                   OR (ocs2.total_score = ocs.total_score AND ocs2.correct_count > ocs.correct_count)
                   OR (ocs2.total_score = ocs.total_score AND ocs2.correct_count = ocs.correct_count AND ocs2.time_seconds < ocs.time_seconds)
                   OR (ocs2.total_score = ocs.total_score AND ocs2.correct_count = ocs.correct_count AND ocs2.time_seconds = ocs.time_seconds AND ocs2.submitted_at < ocs.submitted_at))
              ) AS user_rank
       FROM open_challenges oc
       LEFT JOIN open_challenge_submissions ocs ON ocs.challenge_id = oc.id AND ocs.user_id = $1
       WHERE oc.posted_by_user_id = $1 AND oc.is_visible = TRUE
       ORDER BY oc.posted_at DESC`,
      [me]
    );
    res.json({ challenges: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:id — Challenge detail with top 5 leaderboard
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.userId!;
  const { id } = req.params;

  try {
    // Fetch challenge
    const challengeResult = await pool.query(
      'SELECT * FROM open_challenges WHERE id = $1 AND is_visible = TRUE',
      [id]
    );
    if (!challengeResult.rows[0]) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }
    const challenge = challengeResult.rows[0];

    // Top 5 leaderboard
    const leaderboardResult = await pool.query(
      `SELECT id, user_id, username, correct_count, total_questions, total_score, time_seconds, submitted_at
       FROM open_challenge_submissions
       WHERE challenge_id = $1 AND is_visible = TRUE
       ORDER BY total_score DESC, correct_count DESC, time_seconds ASC, submitted_at ASC
       LIMIT 5`,
      [id]
    );
    const leaderboard = leaderboardResult.rows.map((row, idx) => ({
      ...row,
      rank: idx + 1,
      is_current_user: row.user_id === me,
    }));

    // User's own attempt (with rank)
    const userAttemptResult = await pool.query(
      `SELECT ocs.*,
              (SELECT COUNT(*) + 1 FROM open_challenge_submissions ocs2
               WHERE ocs2.challenge_id = $1 AND ocs2.is_visible = TRUE
                 AND (ocs2.total_score > ocs.total_score
                   OR (ocs2.total_score = ocs.total_score AND ocs2.correct_count > ocs.correct_count)
                   OR (ocs2.total_score = ocs.total_score AND ocs2.correct_count = ocs.correct_count AND ocs2.time_seconds < ocs.time_seconds)
                   OR (ocs2.total_score = ocs.total_score AND ocs2.correct_count = ocs.correct_count AND ocs2.time_seconds = ocs.time_seconds AND ocs2.submitted_at < ocs.submitted_at))
              ) AS rank
       FROM open_challenge_submissions ocs
       WHERE ocs.challenge_id = $1 AND ocs.user_id = $2 AND ocs.is_visible = TRUE`,
      [id, me]
    );
    const userAttempt = userAttemptResult.rows[0]
      ? { ...userAttemptResult.rows[0], rank: parseInt(userAttemptResult.rows[0].rank) }
      : null;

    res.json({ ...challenge, leaderboard, user_attempt: userAttempt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /:id/start — Start playing an open challenge (creates a game record)
router.post('/:id/start', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.userId!;
  const { id } = req.params;

  try {
    // Fetch challenge
    const challengeResult = await pool.query(
      'SELECT * FROM open_challenges WHERE id = $1 AND is_visible = TRUE',
      [id]
    );
    if (!challengeResult.rows[0]) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }
    const challenge = challengeResult.rows[0];

    // Check expiry
    if (new Date(challenge.expires_at) < new Date()) {
      res.status(410).json({ error: 'Challenge has expired' });
      return;
    }

    // Check if user already played this challenge
    const existingResult = await pool.query(
      'SELECT id FROM open_challenge_submissions WHERE challenge_id = $1 AND user_id = $2',
      [id, me]
    );
    if (existingResult.rows[0]) {
      res.status(409).json({ error: 'You have already played this challenge' });
      return;
    }

    // Create a game record using the challenge's question set
    const gameId = uuidv4();
    await pool.query(
      `INSERT INTO games (id, question_set_id, player_a_id, category, game_mode, status)
       VALUES ($1, $2, $3, $4, 'async', 'active')`,
      [gameId, challenge.question_set_id, me, challenge.category]
    );

    res.json({
      gameId,
      questionSetId: challenge.question_set_id,
      category: challenge.category,
      mode: challenge.mode,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /:id/submit — Submit an attempt at a challenge
router.post('/:id/submit', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.userId!;
  const { id } = req.params;
  const { correct_count, total_questions, total_score, time_seconds } = req.body;

  if (correct_count == null || total_questions == null || total_score == null || time_seconds == null) {
    res.status(400).json({ error: 'correct_count, total_questions, total_score, and time_seconds are required' });
    return;
  }

  try {
    // Fetch challenge
    const challengeResult = await pool.query(
      'SELECT * FROM open_challenges WHERE id = $1 AND is_visible = TRUE',
      [id]
    );
    if (!challengeResult.rows[0]) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }
    const challenge = challengeResult.rows[0];

    // Check expiry
    if (new Date(challenge.expires_at) < new Date()) {
      res.status(410).json({ error: 'Challenge has expired' });
      return;
    }

    // Validate total_questions matches challenge mode
    const expectedQuestions = challenge.mode === '5Q' ? 5 : 10;
    if (total_questions !== expectedQuestions) {
      res.status(400).json({ error: `total_questions must be ${expectedQuestions} for ${challenge.mode} mode` });
      return;
    }

    // Look up submitter's username
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [me]);
    const username: string = userResult.rows[0].username;

    const submissionId = uuidv4();

    // Insert submission — UNIQUE(challenge_id, user_id) prevents duplicates
    await pool.query(
      `INSERT INTO open_challenge_submissions (id, challenge_id, user_id, username, correct_count, total_questions, total_score, time_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [submissionId, id, me, username, correct_count, total_questions, total_score, time_seconds]
    );

    // Update cached stats atomically
    await pool.query(
      `UPDATE open_challenges
       SET player_count = player_count + 1,
           high_score = CASE WHEN $1 > high_score THEN $1 ELSE high_score END,
           high_score_username = CASE WHEN $1 > high_score THEN $2 ELSE high_score_username END,
           updated_at = NOW()
       WHERE id = $3`,
      [total_score, username, id]
    );

    // Compute submitter's rank
    const rankResult = await pool.query(
      `SELECT COUNT(*) + 1 AS rank
       FROM open_challenge_submissions
       WHERE challenge_id = $1 AND is_visible = TRUE
         AND (total_score > $2
           OR (total_score = $2 AND correct_count > $3)
           OR (total_score = $2 AND correct_count = $3 AND time_seconds < $4)
           OR (total_score = $2 AND correct_count = $3 AND time_seconds = $4 AND submitted_at < $5))`,
      [id, total_score, correct_count, time_seconds, new Date()]
    );

    res.json({
      submission: {
        id: submissionId,
        challenge_id: id,
        user_id: me,
        username,
        correct_count,
        total_questions,
        total_score,
        time_seconds,
      },
      rank: parseInt(rankResult.rows[0].rank),
    });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'You have already played this challenge' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

export default router;
