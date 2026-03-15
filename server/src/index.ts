import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { WebSocketServer } from 'ws';
import authRoutes from './routes/auth';
import gameRoutes from './routes/games';
import questionRoutes from './routes/questions';
import userRoutes from './routes/users';
import challengeRoutes from './routes/challenges';
import roomRoutes from './routes/rooms';
import friendRoutes from './routes/friends';
import { syncGameManager } from './services/syncGame';
import { roomGameManager } from './services/roomGame';
import pool from './db';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CLIENT_URL ?? 'http://localhost:5173').split(',');
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now (auth is via JWT, not cookies)
    }
  },
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/privacy', (_req, res) => res.sendFile(path.join(__dirname, '../../client/public/privacy.html')));

app.use('/auth', authRoutes);
app.use('/games', gameRoutes);
app.use('/users', userRoutes);
app.use('/friends', friendRoutes);
app.use('/challenges', challengeRoutes);
app.use('/rooms', roomRoutes);
app.use('/', questionRoutes); // /categories and /questions/set/:id

const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
syncGameManager.attach(wss);

const roomWss = new WebSocketServer({ server: httpServer, path: '/room-ws' });
roomGameManager.attach(roomWss);

// Ensure avatar_id column exists (idempotent)
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_id INTEGER NOT NULL DEFAULT 0`)
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
