import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import authRoutes from './routes/auth';
import gameRoutes from './routes/games';
import questionRoutes from './routes/questions';
import userRoutes from './routes/users';
import challengeRoutes from './routes/challenges';
import roomRoutes from './routes/rooms';
import { syncGameManager } from './services/syncGame';
import { roomGameManager } from './services/roomGame';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/games', gameRoutes);
app.use('/users', userRoutes);
app.use('/challenges', challengeRoutes);
app.use('/rooms', roomRoutes);
app.use('/', questionRoutes); // /categories and /questions/set/:id

const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
syncGameManager.attach(wss);

const roomWss = new WebSocketServer({ server: httpServer, path: '/room-ws' });
roomGameManager.attach(roomWss);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
