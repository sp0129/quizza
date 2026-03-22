import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import pool from '../db';

interface RoomPlayerSocket {
  ws: WebSocket;
  username: string;
}

interface PlayerInfo {
  playerId: string;
  username: string;
  score: number;
  finished: boolean;
  isHost?: boolean;
}

interface RoomState {
  roomId: string;
  players: Map<string, RoomPlayerSocket>; // playerId → socket+username
  cachedPlayers: PlayerInfo[];            // latest player list from DB
}

interface RoomSyncState {
  playerIds: Set<string>;
  questionAnswers: Map<number, Set<string>>; // questionIndex → playerIds who answered
  currentQuestion: number;
  timer: ReturnType<typeof setTimeout> | null;
  totalQuestions: number;
  finished: boolean;
}

// How long (ms) the server waits before forcing question advancement.
// Slightly longer than the client's 30s so client timers expire first.
const QUESTION_TIMEOUT_MS = 31_000;

class RoomGameManager {
  private rooms = new Map<string, RoomState>();
  private syncStates = new Map<string, RoomSyncState>();
  // Track rooms that already broadcast room_finished to avoid double-fire
  private finishedRooms = new Set<string>();

  private getOrCreateRoom(roomId: string): RoomState {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, { roomId, players: new Map(), cachedPlayers: [] });
    }
    return this.rooms.get(roomId)!;
  }

  attach(wss: WebSocketServer) {
    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url ?? '', 'ws://localhost');
      const token = url.searchParams.get('token');
      const roomId = url.searchParams.get('roomId');
      const username = url.searchParams.get('username') ?? 'Player';

      if (!token || !roomId) { ws.close(1008, 'Missing token or roomId'); return; }

      let playerId: string;
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        playerId = payload.userId;
      } catch {
        ws.close(1008, 'Invalid token');
        return;
      }

      const room = this.getOrCreateRoom(roomId);
      room.players.set(playerId, { ws, username });

      // Send the current player list to the newly connected client immediately.
      if (room.cachedPlayers.length > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'player_joined', players: room.cachedPlayers }));
      }

      // If a game is already in progress, make sure this player is tracked in the
      // sync state (handles reconnections and React StrictMode double-mount).
      const existingSync = this.syncStates.get(roomId);
      if (existingSync && !existingSync.finished) {
        existingSync.playerIds.add(playerId);
        // Send current game state so reconnecting clients can catch up.
        const answered = existingSync.questionAnswers.get(existingSync.currentQuestion)?.has(playerId) ?? false;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'sync_state',
            currentQuestion: existingSync.currentQuestion,
            answered,
          }));
        }
      }

      ws.on('close', () => {
        // Only act if this specific WS instance is still the active one for this
        // player. A stale close event (e.g. from a React StrictMode double-mount)
        // must NOT evict the newer WS that has already replaced it.
        if (room.players.get(playerId)?.ws !== ws) return;

        room.players.delete(playerId);
        if (room.players.size === 0) this.rooms.delete(roomId);

        // Remove disconnected player from sync so we don't wait for them forever.
        // IMPORTANT: never delete the syncState itself — the server-side timer must
        // keep running so the game can advance even if all WS connections drop.
        // Reconnecting clients will receive a sync_state message to catch up.
        const sync = this.syncStates.get(roomId);
        if (sync && !sync.finished) {
          sync.playerIds.delete(playerId);
        }
      });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
        } catch {}
      });
    });
  }

  getCurrentQuestion(roomId: string): number | null {
    const sync = this.syncStates.get(roomId);
    return (sync && !sync.finished) ? sync.currentQuestion : null;
  }

  notifyPlayerJoined(roomId: string, players: PlayerInfo[]) {
    const room = this.getOrCreateRoom(roomId);
    room.cachedPlayers = players;
    this.broadcastToRoom(roomId, { type: 'player_joined', players });
  }

  broadcastGameStarted(roomId: string, questionCount: number) {
    this.broadcastToRoom(roomId, { type: 'game_started', questionCount });
  }

  broadcastScoreUpdate(roomId: string, leaderboard: { username: string; score: number; finished: boolean }[]) {
    this.broadcastToRoom(roomId, { type: 'score_update', leaderboard });
  }

  broadcastRoomFinished(roomId: string, leaderboard: { username: string; score: number; finished: boolean }[]) {
    if (this.finishedRooms.has(roomId)) return; // prevent double-broadcast
    this.finishedRooms.add(roomId);
    this.broadcastToRoom(roomId, { type: 'room_finished', leaderboard });
    // Clean up after a short delay
    setTimeout(() => this.finishedRooms.delete(roomId), 60_000);
  }

  // ── Sync / question advancement ──────────────────────────────────────────

  /** Call when the host starts the game. Begins the server-side question timer. */
  initGameSync(roomId: string, playerIds: string[], totalQuestions = 10) {
    // Clean up any stale sync state
    const old = this.syncStates.get(roomId);
    if (old?.timer) clearTimeout(old.timer);

    this.syncStates.set(roomId, {
      playerIds: new Set(playerIds),
      questionAnswers: new Map(),
      currentQuestion: 0,
      timer: null,
      totalQuestions,
      finished: false,
    });
    this.scheduleQuestionAdvance(roomId, 0);
  }

  /** Call from the answer route each time a player submits an answer. */
  recordAnswer(roomId: string, playerId: string, questionIndex: number) {
    const sync = this.syncStates.get(roomId);
    if (!sync || sync.finished) return;
    if (questionIndex !== sync.currentQuestion) return; // late/duplicate, ignore

    if (!sync.questionAnswers.has(questionIndex)) {
      sync.questionAnswers.set(questionIndex, new Set());
    }
    sync.questionAnswers.get(questionIndex)!.add(playerId);

    const answeredCount = sync.questionAnswers.get(questionIndex)!.size;
    if (answeredCount >= sync.playerIds.size) {
      // All players answered — advance immediately
      this.advanceQuestion(roomId, questionIndex).catch(console.error);
    }
  }

  private scheduleQuestionAdvance(roomId: string, questionIndex: number) {
    const sync = this.syncStates.get(roomId);
    if (!sync) return;
    if (sync.timer) clearTimeout(sync.timer);
    sync.timer = setTimeout(
      () => this.advanceQuestion(roomId, questionIndex).catch(console.error),
      QUESTION_TIMEOUT_MS
    );
  }

  private async advanceQuestion(roomId: string, questionIndex: number) {
    const sync = this.syncStates.get(roomId);
    if (!sync || sync.finished || sync.currentQuestion !== questionIndex) return;

    if (sync.timer) { clearTimeout(sync.timer); sync.timer = null; }

    const nextIndex = questionIndex + 1;

    if (nextIndex < sync.totalQuestions) {
      sync.currentQuestion = nextIndex;
      this.broadcastToRoom(roomId, { type: 'advance_question', nextIndex });
      this.scheduleQuestionAdvance(roomId, nextIndex);
    } else {
      // All questions exhausted — trigger room finish
      sync.finished = true;
      await this.triggerRoomFinish(roomId);
      this.syncStates.delete(roomId);
    }
  }

  /** Fetch final leaderboard from DB and broadcast room_finished. */
  private async triggerRoomFinish(roomId: string) {
    try {
      // Idempotency: skip if the route already finished this room
      const roomResult = await pool.query('SELECT status FROM rooms WHERE id = $1', [roomId]);
      const room = roomResult.rows[0];
      if (!room) return;

      if (room.status !== 'finished') {
        await pool.query(`UPDATE rooms SET status = 'finished' WHERE id = $1`, [roomId]);
      }

      const lbResult = await pool.query(
        `SELECT rp.username, rp.score, rp.finished, u.is_guest
         FROM room_players rp
         JOIN users u ON u.id = rp.player_id
         WHERE rp.room_id = $1 ORDER BY rp.score DESC`,
        [roomId]
      );
      this.broadcastRoomFinished(roomId, lbResult.rows);
    } catch (err) {
      console.error('roomGame: error finishing room', err);
    }
  }

  private broadcastToRoom(roomId: string, msg: object) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const payload = JSON.stringify(msg);
    for (const { ws } of room.players.values()) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }
}

export const roomGameManager = new RoomGameManager();
