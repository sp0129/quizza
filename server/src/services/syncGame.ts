import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import pool from '../db';

interface PlayerSocket {
  ws: WebSocket;
  userId: string;
}

interface SyncGameRoom {
  gameId: string;
  players: Map<string, WebSocket>; // userId → ws
  answeredThisRound: Set<string>;  // userIds who answered current question
  currentQuestion: number;
}

class SyncGameManager {
  private rooms = new Map<string, SyncGameRoom>();
  private userToGame = new Map<string, string>(); // userId → gameId

  attach(wss: WebSocketServer) {
    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url ?? '', 'ws://localhost');
      const token = url.searchParams.get('token');
      const gameId = url.searchParams.get('gameId');

      if (!token || !gameId) { ws.close(1008, 'Missing token or gameId'); return; }

      let userId: string;
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        userId = payload.userId;
      } catch {
        ws.close(1008, 'Invalid token');
        return;
      }

      // Join or create room
      if (!this.rooms.has(gameId)) {
        this.rooms.set(gameId, {
          gameId,
          players: new Map(),
          answeredThisRound: new Set(),
          currentQuestion: 0,
        });
      }
      const room = this.rooms.get(gameId)!;
      room.players.set(userId, ws);
      this.userToGame.set(userId, gameId);

      ws.on('close', () => {
        room.players.delete(userId);
        this.userToGame.delete(userId);
        if (room.players.size === 0) this.rooms.delete(gameId);
      });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
        } catch {}
      });

      // Notify both players when second player connects
      if (room.players.size === 2) {
        this.broadcast(room, { type: 'game_start', question: 0 });
      }
    });
  }

  notifyAnswer(gameId: string, userId: string, questionIndex: number) {
    const room = this.rooms.get(gameId);
    if (!room) return;

    room.answeredThisRound.add(userId);

    // Tell the other player "opponent answered"
    for (const [pid, ws] of room.players) {
      if (pid !== userId) {
        this.send(ws, { type: 'opponent_answered', question: questionIndex });
      }
    }

    // If both players answered, advance
    if (room.answeredThisRound.size >= 2) {
      room.answeredThisRound.clear();
      room.currentQuestion = questionIndex + 1;
      this.broadcast(room, { type: 'advance', question: room.currentQuestion });
    }
  }

  notifyPlayerFinished(gameId: string, userId: string, score: number) {
    const room = this.rooms.get(gameId);
    if (!room) return;
    for (const [pid, ws] of room.players) {
      if (pid !== userId) {
        this.send(ws, { type: 'opponent_finished', score });
      }
    }
  }

  broadcastGameResult(gameId: string, payload: object) {
    const room = this.rooms.get(gameId);
    if (room) this.broadcast(room, { type: 'game_over', ...payload });
  }

  notifyOpponentQuit(gameId: string, remainingPlayerId: string, myScore: number) {
    const room = this.rooms.get(gameId);
    if (!room) return;
    const ws = room.players.get(remainingPlayerId);
    if (ws) this.send(ws, { type: 'opponent_quit', myScore });
  }

  private broadcast(room: SyncGameRoom, msg: object) {
    for (const ws of room.players.values()) this.send(ws, msg);
  }

  private send(ws: WebSocket, msg: object) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }
}

export const syncGameManager = new SyncGameManager();
