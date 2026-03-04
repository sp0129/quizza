import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import PizzaMascot from '../components/PizzaMascot';
import Sparkles from '../components/Sparkles';
import { playGibberish } from '../utils/sounds';

interface Question {
  question: string;
  difficulty: string;
  all_answers: string[];
}

interface LeaderboardEntry {
  username: string;
  score: number;
  finished: boolean;
}

interface RoomPlayer {
  playerId: string;
  username: string;
  score: number;
  finished: boolean;
  isHost?: boolean;
}

type Phase = 'lobby' | 'loading' | 'playing' | 'answered' | 'finished';
type MascotMood = 'thinking' | 'celebrating' | 'wrong';

const QUESTION_TIME = 30;

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const isHost = params.get('host') === 'true';
  const questionSetId = params.get('qsid');

  const [phase, setPhase] = useState<Phase>('lobby');
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [roomCode, setRoomCode] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [mascotMood, setMascotMood] = useState<MascotMood>('thinking');
  const [mascotKey, setMascotKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [error, setError] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(Date.now());

  const triggerMascot = (mood: MascotMood) => {
    setMascotMood(mood);
    setMascotKey(k => k + 1);
  };

  // Fetch room info + connect WS
  useEffect(() => {
    if (!roomId) return;

    api.get<{ room_code: string; players: RoomPlayer[] }>(`/rooms/${roomId}`).then(data => {
      setRoomCode(data.room_code);
      // GET returns players already normalized (playerId, isHost) from the server
      setPlayers(data.players ?? []);
    }).catch(console.error);

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const username = storedUser ? (JSON.parse(storedUser) as { username: string }).username : '';
    const wsBase = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001';
    const ws = new WebSocket(`${wsBase}/room-ws?token=${token}&roomId=${roomId}&username=${encodeURIComponent(username)}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'player_joined') setPlayers(msg.players);
      if (msg.type === 'game_started') setPhase('loading');
      if (msg.type === 'score_update') setLeaderboard(msg.leaderboard);
      if (msg.type === 'room_finished') {
        setLeaderboard(msg.leaderboard);
        setPhase('finished');
        playGibberish('happy');
      }
    };

    return () => ws.close();
  }, [roomId]);

  // Load questions when game starts
  useEffect(() => {
    if (phase !== 'loading' || !questionSetId) return;
    api.get<{ questions: Question[] }>(`/questions/set/${questionSetId}`).then(data => {
      setQuestions(data.questions);
      setPhase('playing');
    }).catch(console.error);
  }, [phase, questionSetId]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    questionStartRef.current = Date.now();
    setTimeLeft(QUESTION_TIME);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, currentIndex]);

  useEffect(() => {
    if (timeLeft === 0 && phase === 'playing') submitAnswer('__timeout__', QUESTION_TIME);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const submitAnswer = useCallback(async (answer: string, forcedTime?: number) => {
    if (phase !== 'playing' || !roomId) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTaken = forcedTime ?? Math.round((Date.now() - questionStartRef.current) / 1000);
    setSelectedAnswer(answer);
    setPhase('answered');

    try {
      const result = await api.post<{ isCorrect: boolean; points: number; totalScore?: number }>(
        `/rooms/${roomId}/answer`,
        {
          questionIndex: currentIndex,
          selectedAnswer: answer === '__timeout__' ? '' : answer,
          timeTakenSeconds: Math.min(timeTaken, 30),
        }
      );

      setLastCorrect(result.isCorrect);
      if (result.points) setScore(s => s + result.points);
      triggerMascot(result.isCorrect ? 'celebrating' : 'wrong');

      if (currentIndex < 9) {
        setTimeout(() => {
          setCurrentIndex(i => i + 1);
          setPhase('playing');
          setSelectedAnswer(null);
          setLastCorrect(null);
          triggerMascot('thinking');
        }, 1800);
      }
    } catch (err) {
      console.error(err);
    }
  }, [phase, currentIndex, roomId]);

  const startGame = async () => {
    if (!roomId) return;
    setStartLoading(true);
    try {
      await api.post(`/rooms/${roomId}/start`, {});
      // Transition immediately on HTTP success — don't rely solely on WS message.
      // The WS 'game_started' will handle non-host players.
      setPhase('loading');
    } catch (err: any) {
      setError(err.message);
      setStartLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── LOBBY ──
  if (phase === 'lobby') {
    return (
      <div className="gradient-page-wrapper">
        <Sparkles />
        <div className="gradient-page">
          <div className="room-lobby">
            <h1 className="page-title text-center">🏠 Room Lobby</h1>
            <div className="room-code-display">
              <span className="room-code-label">Room Code</span>
              <span className="room-code-value">{roomCode}</span>
              <button className="btn btn-ghost btn-sm" onClick={copyCode}>{copied ? '✓ Copied' : 'Copy'}</button>
            </div>
            <p className="text-muted text-center">Share this code with friends — up to 8 players can join.</p>

            <div className="room-player-list">
              <h3>Players ({players.length})</h3>
              {players.map((p, i) => (
                <div key={p.playerId ?? i} className="room-player-row">
                  <span className="room-player-rank">{i + 1}</span>
                  <span className="room-player-name">
                    {p.username}{p.isHost ? ' 👑' : ''}
                  </span>
                </div>
              ))}
            </div>

            {error && <p className="inline-error">{error}</p>}

            {isHost ? (
              <button
                className="btn btn-room btn-block"
                onClick={startGame}
                disabled={startLoading || players.length < 1}
              >
                {startLoading ? 'Starting...' : '▶ Start Game'}
              </button>
            ) : (
              <p className="room-waiting-msg">Waiting for host to start the game…</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── LOADING ──
  if (phase === 'loading') {
    return (
      <div className="game-gradient-wrapper">
        <Sparkles />
        <div className="loading">Loading questions…</div>
      </div>
    );
  }

  // ── FINISHED ──
  if (phase === 'finished') {
    return (
      <div className="game-gradient-wrapper">
        <Sparkles />
        <div className="game-over">
          <div className="game-over-mascot">
            <div className="speech-bubble">Game Over! 🎉</div>
            <PizzaMascot mood="celebrating" size={130} className="mascot-celebrating" />
          </div>
          <div className="room-leaderboard-final">
            <h2 className="leaderboard-title">Final Leaderboard</h2>
            {leaderboard.map((entry, i) => (
              <div key={entry.username} className={`leaderboard-row rank-${i + 1}`}>
                <span className="lb-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                <span className="lb-name">{entry.username}</span>
                <span className="lb-score">{entry.score} pts</span>
              </div>
            ))}
          </div>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  // ── PLAYING / ANSWERED ──
  const question = questions[currentIndex];
  if (!question) return null;

  const progressPct = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="game-gradient-wrapper">
      <Sparkles />

      {leaderboard.length > 0 && (
        <div className="room-score-strip">
          {leaderboard.slice(0, 4).map((entry, i) => (
            <span key={entry.username} className="room-score-chip">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {entry.username} {entry.score}
            </span>
          ))}
        </div>
      )}

      <div className="game-layout">
        <div className="game-top-zone">
          <div className="game-topbar">
            <div className="game-progress-track">
              <div className="game-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className={`game-countdown${timeLeft <= 10 ? ' urgent' : ''}`}>{timeLeft}s</span>
          </div>

          <div className="game-meta-row">
            <span className="game-score-pill">⭐ {score} pts</span>
            <span className="game-q-counter">{currentIndex + 1} / {questions.length}</span>
          </div>

          <div className="game-question-wrap">
            <p className="game-question-big">{question.question}</p>
          </div>
        </div>

        <div className="game-bottom-zone">
          <div className="game-mascot-center">
            <PizzaMascot key={mascotKey} mood={mascotMood} size={110} className={`mascot-${mascotMood}`} />
          </div>

          {question.all_answers.map((answer, i) => {
            let cls = 'answer-pill';
            if (selectedAnswer) {
              if (lastCorrect === true && answer === selectedAnswer) cls += ' correct';
              else if (lastCorrect === false && answer === selectedAnswer) cls += ' wrong';
            }
            return (
              <button key={i} className={cls} onClick={() => submitAnswer(answer)} disabled={phase !== 'playing'}>
                {answer}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
