import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { fetchAndStoreQuestionSet, getQuestionSet } from '../services/questions';
import { calculatePoints } from '../services/scoring';
import { syncGameManager } from '../services/syncGame';

const router = Router();
const ASYNC_EXPIRY_HOURS = 24;
const MATCHMAKING_TIMEOUT_MS = 15_000;

// POST /games/solo — instant solo game, no matchmaking
router.post('/solo', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { category, categoryId, questionCount } = req.body;
  if (!category) {
    res.status(400).json({ error: 'category is required' });
    return;
  }
  const count = Number(questionCount) === 5 ? 5 : 10;
  try {
    const questionSetId = await fetchAndStoreQuestionSet(category, categoryId, count);
    const gameId = uuidv4();
    await pool.query(
      `INSERT INTO games (id, question_set_id, player_a_id, category, game_mode, status)
       VALUES ($1, $2, $3, $4, 'async', 'active')`,
      [gameId, questionSetId, req.userId, category]
    );
    res.json({ gameId, questionSetId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /games/create-random
router.post('/create-random', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { category, categoryId, questionCount } = req.body;
  if (!category) {
    res.status(400).json({ error: 'category is required' });
    return;
  }
  const userId = req.userId!;
  const count = Number(questionCount) === 5 ? 5 : 10;

  try {
    // Check if there's already someone waiting in this category
    const queueResult = await pool.query(
      `SELECT id, user_id FROM matchmaking_queue
       WHERE category = $1 AND user_id != $2
       AND joined_at > NOW() - INTERVAL '${MATCHMAKING_TIMEOUT_MS / 1000} seconds'
       ORDER BY joined_at ASC LIMIT 1`,
      [category, userId]
    );

    if (queueResult.rows.length > 0) {
      // Match found — create sync game
      const opponent = queueResult.rows[0];
      await pool.query('DELETE FROM matchmaking_queue WHERE id = $1', [opponent.id]);

      const questionSetId = await fetchAndStoreQuestionSet(category, categoryId, count);
      const gameId = uuidv4();
      const expiresAt = new Date(Date.now() + ASYNC_EXPIRY_HOURS * 3600_000);

      await pool.query(
        `INSERT INTO games (id, question_set_id, player_a_id, player_b_id, category, game_mode, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, 'sync', 'active', $6)`,
        [gameId, questionSetId, opponent.user_id, userId, category, expiresAt]
      );

      res.json({ gameId, mode: 'sync', questionSetId, opponentId: opponent.user_id });
      return;
    }

    // No match — join queue, wait, then convert to async
    const queueEntryId = uuidv4();
    await pool.query(
      'INSERT INTO matchmaking_queue (id, user_id, category) VALUES ($1, $2, $3)',
      [queueEntryId, userId, category]
    );

    // Wait for a match
    const matched = await waitForMatch(queueEntryId, userId, category, MATCHMAKING_TIMEOUT_MS);

    if (matched) {
      res.json(matched);
      return;
    }

    // Timeout — remove from queue and create async game
    await pool.query('DELETE FROM matchmaking_queue WHERE id = $1', [queueEntryId]);

    const questionSetId = await fetchAndStoreQuestionSet(category, categoryId, count);
    const gameId = uuidv4();
    const expiresAt = new Date(Date.now() + ASYNC_EXPIRY_HOURS * 3600_000);

    await pool.query(
      `INSERT INTO games (id, question_set_id, player_a_id, category, game_mode, status, expires_at)
       VALUES ($1, $2, $3, $4, 'async', 'waiting', $5)`,
      [gameId, questionSetId, userId, category, expiresAt]
    );

    res.json({ gameId, mode: 'async', questionSetId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

async function waitForMatch(
  queueEntryId: string,
  userId: string,
  category: string,
  timeoutMs: number
): Promise<{ gameId: string; mode: string; questionSetId: string; opponentId: string } | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const interval = setInterval(async () => {
      // Check if we were matched (our queue entry was deleted by someone else)
      const entryStillExists = await pool.query(
        'SELECT id FROM matchmaking_queue WHERE id = $1',
        [queueEntryId]
      );
      if (!entryStillExists.rows.length) {
        clearInterval(interval);
        // Find the game that was created for us
        const gameResult = await pool.query(
          `SELECT id, question_set_id, player_a_id FROM games
           WHERE (player_a_id = $1 OR player_b_id = $1) AND game_mode = 'sync'
           ORDER BY created_at DESC LIMIT 1`,
          [userId]
        );
        if (gameResult.rows[0]) {
          const g = gameResult.rows[0];
          const opponentId = g.player_a_id === userId ? null : g.player_a_id;
          resolve({ gameId: g.id, mode: 'sync', questionSetId: g.question_set_id, opponentId });
        } else {
          resolve(null);
        }
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        clearInterval(interval);
        resolve(null);
      }
    }, 2000);
  });
}

// GET /games/pending — async challenges waiting for me
router.get('/pending', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT g.id, g.category, g.game_mode, g.player_a_score, g.expires_at, g.created_at,
              u.username AS challenger_username
       FROM games g
       JOIN users u ON u.id = g.player_a_id
       WHERE g.player_b_id IS NULL
         AND g.game_mode = 'async'
         AND g.status = 'waiting'
         AND g.player_a_id != $1
         AND (g.expires_at IS NULL OR g.expires_at > NOW())
       ORDER BY g.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /games/:gameId
router.get('/:gameId', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT g.*,
              ua.username AS player_a_username,
              ub.username AS player_b_username
       FROM games g
       JOIN users ua ON ua.id = g.player_a_id
       LEFT JOIN users ub ON ub.id = g.player_b_id
       WHERE g.id = $1`,
      [req.params.gameId]
    );
    const game = result.rows[0];
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    // Only participants can view
    if (game.player_a_id !== req.userId && game.player_b_id !== req.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    res.json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /games/:gameId/status
router.get('/:gameId/status', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id, status, game_mode, player_a_id, player_b_id,
              player_a_score, player_b_score, winner_id, expires_at
       FROM games WHERE id = $1`,
      [req.params.gameId]
    );
    const game = result.rows[0];
    if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
    if (game.player_a_id !== req.userId && game.player_b_id !== req.userId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    res.json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /games/:gameId/answer
router.post('/:gameId/answer', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { questionIndex, selectedAnswer, timeTakenSeconds } = req.body;
  const userId = req.userId!;

  if (questionIndex === undefined || selectedAnswer === undefined || selectedAnswer === null || timeTakenSeconds === undefined) {
    res.status(400).json({ error: 'questionIndex, selectedAnswer, and timeTakenSeconds are required' });
    return;
  }

  try {
    const gameResult = await pool.query(
      'SELECT * FROM games WHERE id = $1',
      [req.params.gameId]
    );
    const game = gameResult.rows[0];
    if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
    if (game.player_a_id !== userId && game.player_b_id !== userId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    if (game.expires_at && new Date(game.expires_at) < new Date()) {
      res.status(410).json({ error: 'Game has expired' }); return;
    }
    if (game.status === 'completed') {
      res.status(409).json({ error: 'Game already completed' }); return;
    }

    // Get the correct answer
    const qs = await getQuestionSet(game.question_set_id);
    if (!qs) { res.status(500).json({ error: 'Question set not found' }); return; }

    const question = qs.questions[questionIndex];
    if (!question) { res.status(400).json({ error: 'Invalid question index' }); return; }

    const isCorrect = selectedAnswer === question.correct_answer;
    const points = calculatePoints(isCorrect, timeTakenSeconds);

    // Record answer (ignore duplicate submissions)
    await pool.query(
      `INSERT INTO game_answers (id, game_id, player_id, question_index, selected_answer, is_correct, time_taken_seconds, points_awarded)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (game_id, player_id, question_index) DO NOTHING`,
      [uuidv4(), game.id, userId, questionIndex, selectedAnswer, isCorrect, timeTakenSeconds, points]
    );

    // If this is the last question, calculate final score and check completion
    const totalQuestions = qs.questions.length;
    if (questionIndex === totalQuestions - 1) {
      const scoreResult = await pool.query(
        'SELECT COALESCE(SUM(points_awarded), 0) AS total FROM game_answers WHERE game_id = $1 AND player_id = $2',
        [game.id, userId]
      );
      const totalScore = parseInt(scoreResult.rows[0].total);

      const isPlayerA = game.player_a_id === userId;
      const scoreColumn = isPlayerA ? 'player_a_score' : 'player_b_score';
      const finishedColumn = isPlayerA ? 'player_a_finished_at' : 'player_b_finished_at';
      const otherScore = isPlayerA ? game.player_b_score : game.player_a_score;

      await pool.query(
        `UPDATE games SET ${scoreColumn} = $1, ${finishedColumn} = NOW() WHERE id = $2`,
        [totalScore, game.id]
      );

      // If both players have finished, determine winner
      if (otherScore !== null) {
        const myScore = totalScore;
        const opponentScore = otherScore;
        let winnerId: string | null = null;
        if (myScore > opponentScore) winnerId = userId;
        else if (opponentScore > myScore) winnerId = isPlayerA ? game.player_b_id : game.player_a_id;

        await pool.query(
          `UPDATE games SET status = 'completed', winner_id = $1, completed_at = NOW() WHERE id = $2`,
          [winnerId, game.id]
        );

        // Notify sync game manager if applicable
        if (game.game_mode === 'sync') {
          const otherPlayerId = isPlayerA ? game.player_b_id : game.player_a_id;
          // Tell each player what their opponent scored
          syncGameManager.notifyPlayerFinished(game.id, userId, totalScore);              // my score → sent to opponent
          syncGameManager.notifyPlayerFinished(game.id, otherPlayerId, parseInt(otherScore)); // opponent's score → sent to me
          // End the game for both players
          syncGameManager.broadcastGameResult(game.id, {});
        }
      }

      res.json({ isCorrect, points, totalScore, gameComplete: true, correctAnswer: question.correct_answer });
    } else {
      // For sync mode, notify the manager that this player answered
      if (game.game_mode === 'sync') {
        syncGameManager.notifyAnswer(game.id, userId, questionIndex);
      }
      res.json({ isCorrect, points, correctAnswer: question.correct_answer });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /games/:gameId/quit — forfeit a game mid-match
router.post('/:gameId/quit', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  try {
    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [req.params.gameId]);
    const game = gameResult.rows[0];
    if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
    if (game.player_a_id !== userId && game.player_b_id !== userId) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    if (game.status === 'completed') {
      res.status(409).json({ error: 'Game already completed' }); return;
    }

    const isPlayerA = game.player_a_id === userId;
    const opponentId: string | null = isPlayerA ? game.player_b_id : game.player_a_id;

    // SUM quitter's points
    const myScoreResult = await pool.query(
      'SELECT COALESCE(SUM(points_awarded), 0) AS total FROM game_answers WHERE game_id = $1 AND player_id = $2',
      [game.id, userId]
    );
    const myScore = parseInt(myScoreResult.rows[0].total);

    if (opponentId) {
      // SUM opponent's points
      const oppScoreResult = await pool.query(
        'SELECT COALESCE(SUM(points_awarded), 0) AS total FROM game_answers WHERE game_id = $1 AND player_id = $2',
        [game.id, opponentId]
      );
      const oppScore = parseInt(oppScoreResult.rows[0].total);

      const playerAScore = isPlayerA ? myScore : oppScore;
      const playerBScore = isPlayerA ? oppScore : myScore;

      await pool.query(
        `UPDATE games SET player_a_score = $1, player_b_score = $2, status = 'completed', winner_id = $3, completed_at = NOW() WHERE id = $4`,
        [playerAScore, playerBScore, opponentId, game.id]
      );

      if (game.game_mode === 'sync') {
        syncGameManager.notifyOpponentQuit(game.id, opponentId, oppScore);
      }
    } else {
      // No opponent — async waiting game, just close it
      const scoreColumn = isPlayerA ? 'player_a_score' : 'player_b_score';
      await pool.query(
        `UPDATE games SET ${scoreColumn} = $1, status = 'completed', completed_at = NOW() WHERE id = $2`,
        [myScore, game.id]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /games/:gameId/join — player B joins an async game
router.post('/:gameId/join', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;
  try {
    const result = await pool.query(
      `UPDATE games SET player_b_id = $1, status = 'active'
       WHERE id = $2
         AND player_b_id IS NULL
         AND player_a_id != $1
         AND game_mode = 'async'
         AND status = 'waiting'
         AND (expires_at IS NULL OR expires_at > NOW())
       RETURNING id, question_set_id, category`,
      [userId, req.params.gameId]
    );
    if (!result.rows[0]) {
      res.status(409).json({ error: 'Game not available to join' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
