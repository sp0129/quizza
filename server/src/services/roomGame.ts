import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';

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

class RoomGameManager {
  private rooms = new Map<string, RoomState>();

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
      // This covers the race where the player joined via HTTP before their WS connected.
      if (room.cachedPlayers.length > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'player_joined', players: room.cachedPlayers }));
      }

      ws.on('close', () => {
        room.players.delete(playerId);
        if (room.players.size === 0) this.rooms.delete(roomId);
      });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
        } catch {}
      });
    });
  }

  notifyPlayerJoined(roomId: string, players: PlayerInfo[]) {
    const room = this.getOrCreateRoom(roomId);
    room.cachedPlayers = players; // cache for late-connecting WS clients
    this.broadcastToRoom(roomId, { type: 'player_joined', players });
  }

  broadcastGameStarted(roomId: string, questionCount: number) {
    this.broadcastToRoom(roomId, { type: 'game_started', questionCount });
  }

  broadcastScoreUpdate(roomId: string, leaderboard: { username: string; score: number; finished: boolean }[]) {
    this.broadcastToRoom(roomId, { type: 'score_update', leaderboard });
  }

  broadcastRoomFinished(roomId: string, leaderboard: { username: string; score: number; finished: boolean }[]) {
    this.broadcastToRoom(roomId, { type: 'room_finished', leaderboard });
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
