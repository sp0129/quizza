import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { fetchAndStoreQuestionSet, getQuestionSet } from '../services/questions';
import { calculatePoints } from '../services/scoring';
import { roomGameManager } from '../services/roomGame';

const router = Router();

function generateRoomCode(): string {
  return Math.random().toString(36).toUpperCase().slice(2, 8);
}

// POST /rooms — create a new room
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { category, categoryId, timerSeconds, questionCount, difficulty } = req.body;
  const me = req.userId!;

  if (!category) {
    res.status(400).json({ error: 'category is required' });
    return;
  }

  try {
    const count = Number(questionCount) === 5 ? 5 : 10;
    const questionSetId = await fetchAndStoreQuestionSet(category, categoryId, count, difficulty);

    // Generate unique 6-char code with collision retry
    let roomCode = '';
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateRoomCode();
      const existing = await pool.query('SELECT id FROM rooms WHERE room_code = $1', [candidate]);
      if (!existing.rows.length) { roomCode = candidate; break; }
    }
    if (!roomCode) {
      res.status(500).json({ error: 'Could not generate unique room code' });
      return;
    }

    const roomId = uuidv4();

    // Get host username
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [me]);
    const hostUsername: string = userResult.rows[0]?.username ?? 'Host';

    const roomTimer = (timerSeconds === 15) ? 15 : 30;
    await pool.query(
      `INSERT INTO rooms (id, host_id, category, question_set_id, room_code, timer_seconds) VALUES ($1, $2, $3, $4, $5, $6)`,
      [roomId, me, category, questionSetId, roomCode, roomTimer]
    );

    await pool.query(
      `INSERT INTO room_players (room_id, player_id, username) VALUES ($1, $2, $3)`,
      [roomId, me, hostUsername]
    );

    // Seed the WS manager's player cache so that late-connecting clients
    // (including the host themselves) get the initial player list immediately.
    roomGameManager.notifyPlayerJoined(roomId, [{
      playerId: me,
      username: hostUsername,
      score: 0,
      finished: false,
      isHost: true,
    }]);

    res.json({ roomId, roomCode, questionSetId, category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /rooms/join — join by room code
router.post('/join', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { roomCode, displayName } = req.body;
  const me = req.userId!;

  if (!roomCode) {
    res.status(400).json({ error: 'roomCode is required' });
    return;
  }

  try {
    // Look up room by code (any status)
    const roomResult = await pool.query(
      `SELECT * FROM rooms WHERE room_code = $1`,
      [roomCode.toUpperCase()]
    );
    const room = roomResult.rows[0];
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    // Check if expired (>30 min old)
    const ageMs = Date.now() - new Date(room.created_at).getTime();
    if (ageMs > 30 * 60 * 1000) {
      res.status(410).json({ error: 'This room has expired' });
      return;
    }

    // Check if game already started or finished
    if (room.status === 'active') {
      res.status(410).json({ error: 'This game has already started' });
      return;
    }
    if (room.status === 'finished' || room.status === 'abandoned') {
      res.status(410).json({ error: 'This room is no longer active' });
      return;
    }

    // Prefer an explicit displayName (guests pass their chosen name); fall back to DB username
    let username: string;
    if (displayName && typeof displayName === 'string' && displayName.trim()) {
      username = displayName.trim().slice(0, 30);
    } else {
      const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [me]);
      username = userResult.rows[0]?.username ?? 'Player';
    }

    // Insert (ignore if already in)
    await pool.query(
      `INSERT INTO room_players (room_id, player_id, username) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [room.id, me, username]
    );

    // Fetch full player list
    const playersResult = await pool.query(
      `SELECT player_id, username, score, finished FROM room_players WHERE room_id = $1 ORDER BY joined_at`,
      [room.id]
    );
    roomGameManager.notifyPlayerJoined(room.id, playersResult.rows.map(r => ({
      playerId: r.player_id,
      username: r.username,
      score: r.score,
      finished: r.finished,
      isHost: r.player_id === room.host_id,
    })));

    res.json({ roomId: room.id, roomCode: room.room_code, questionSetId: room.question_set_id, category: room.category, timerSeconds: room.timer_seconds ?? 30 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /rooms/:roomId/abandon — host abandons the room
router.post('/:roomId/abandon', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await pool.query(
      `UPDATE rooms SET status = 'abandoned' WHERE id = $1 AND host_id = $2 AND status = 'waiting'`,
      [req.params.roomId, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /rooms/:roomId — get room info + players
router.get('/:roomId', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roomResult = await pool.query('SELECT * FROM rooms WHERE id = $1', [req.params.roomId]);
    const room = roomResult.rows[0];
    if (!room) { res.status(404).json({ error: 'Room not found' }); return; }

    // Check expiry (>30 min) or abandoned
    const ageMs = Date.now() - new Date(room.created_at).getTime();
    if (room.status === 'waiting' && ageMs > 30 * 60 * 1000) {
      res.status(410).json({ error: 'This room has expired' });
      return;
    }
    if (room.status === 'abandoned') {
      res.status(410).json({ error: 'The host left this room' });
      return;
    }

    const playersResult = await pool.query(
      `SELECT player_id, username, score, finished FROM room_players WHERE room_id = $1 ORDER BY joined_at`,
      [room.id]
    );

    const players = playersResult.rows.map(r => ({
      playerId: r.player_id,
      username: r.username,
      score: r.score,
      finished: r.finished,
      isHost: r.player_id === room.host_id,
    }));

    const currentQuestion = roomGameManager.getCurrentQuestion(req.params.roomId);
    res.json({ ...room, hostId: room.host_id, players, currentQuestion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /rooms/:roomId/start — host starts the game
router.post('/:roomId/start', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const me = req.userId!;
  try {
    const roomResult = await pool.query('SELECT * FROM rooms WHERE id = $1', [req.params.roomId]);
    const room = roomResult.rows[0];
    if (!room) { res.status(404).json({ error: 'Room not found' }); return; }
    if (room.host_id !== me) { res.status(403).json({ error: 'Only the host can start' }); return; }
    if (room.status !== 'waiting') { res.status(409).json({ error: 'Room already started' }); return; }

    await pool.query(`UPDATE rooms SET status = 'active' WHERE id = $1`, [room.id]);
    const qs = await getQuestionSet(room.question_set_id);
    const totalQuestions = qs?.questions.length ?? 10;
    roomGameManager.broadcastGameStarted(room.id, totalQuestions);

    // Start server-side sync timer
    const playersResult = await pool.query(
      'SELECT player_id FROM room_players WHERE room_id = $1',
      [room.id]
    );
    const playerIds: string[] = playersResult.rows.map((r: { player_id: string }) => r.player_id);
    roomGameManager.initGameSync(room.id, playerIds, totalQuestions);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /rooms/:roomId/answer
router.post('/:roomId/answer', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { questionIndex, selectedAnswer, timeTakenSeconds } = req.body;
  const me = req.userId!;

  if (questionIndex === undefined || selectedAnswer === undefined || timeTakenSeconds === undefined) {
    res.status(400).json({ error: 'questionIndex, selectedAnswer, and timeTakenSeconds are required' });
    return;
  }

  try {
    const roomResult = await pool.query('SELECT * FROM rooms WHERE id = $1', [req.params.roomId]);
    const room = roomResult.rows[0];
    if (!room) { res.status(404).json({ error: 'Room not found' }); return; }
    if (room.status !== 'active') { res.status(409).json({ error: 'Room is not active' }); return; }

    const qs = await getQuestionSet(room.question_set_id);
    if (!qs) { res.status(500).json({ error: 'Question set not found' }); return; }

    const question = qs.questions[questionIndex];
    if (!question) { res.status(400).json({ error: 'Invalid question index' }); return; }

    const isCorrect = selectedAnswer === question.correct_answer;
    const points = calculatePoints(isCorrect, timeTakenSeconds);

    await pool.query(
      `INSERT INTO room_answers (id, room_id, player_id, question_index, selected_answer, is_correct, time_taken_seconds, points_awarded)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
      [uuidv4(), room.id, me, questionIndex, selectedAnswer, isCorrect, timeTakenSeconds, points]
    );

    // Notify sync manager — advances to next question when all players have answered
    roomGameManager.recordAnswer(req.params.roomId, me, questionIndex);

    let totalScore: number | undefined;
    let perfectBonus = 0;

    // On last question, tally final score
    if (questionIndex === qs.questions.length - 1) {
      const scoreResult = await pool.query(
        `SELECT COALESCE(SUM(points_awarded), 0) AS total, COUNT(*) FILTER (WHERE is_correct) AS correct_count FROM room_answers WHERE room_id = $1 AND player_id = $2`,
        [room.id, me]
      );
      totalScore = parseInt(scoreResult.rows[0].total);
      const correctCount = parseInt(scoreResult.rows[0].correct_count);
      const totalQuestions = qs.questions.length;

      // Perfect accuracy bonus: +100 for 10Q, +50 for 5Q
      perfectBonus = correctCount === totalQuestions ? (totalQuestions >= 10 ? 100 : 50) : 0;
      totalScore += perfectBonus;

      await pool.query(
        `UPDATE room_players SET score = $1, finished = true WHERE room_id = $2 AND player_id = $3`,
        [totalScore, room.id, me]
      );
    }

    // Fetch leaderboard
    const lbResult = await pool.query(
      `SELECT username, score, finished FROM room_players WHERE room_id = $1 ORDER BY score DESC`,
      [room.id]
    );
    const leaderboard = lbResult.rows;

    // Check if all players finished
    const allFinished = leaderboard.every(p => p.finished);
    if (allFinished) {
      await pool.query(`UPDATE rooms SET status = 'finished' WHERE id = $1`, [room.id]);
      roomGameManager.broadcastRoomFinished(room.id, leaderboard);
    } else if (questionIndex === qs.questions.length - 1) {
      roomGameManager.broadcastScoreUpdate(room.id, leaderboard);
    } else {
      roomGameManager.broadcastScoreUpdate(room.id, leaderboard);
    }

    res.json({ isCorrect, points, correctAnswer: question.correct_answer, ...(totalScore !== undefined ? { totalScore, perfectBonus } : {}) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
