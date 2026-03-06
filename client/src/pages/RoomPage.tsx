import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import PizzaMascot from '../components/PizzaMascot';
import Sparkles from '../components/Sparkles';
import { playGibberish } from '../utils/sounds';
import { getCategoryTheme } from '../utils/categoryThemes';
import { useAuth } from '../hooks/useAuth';

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

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isHost = params.get('host') === 'true';
  const questionSetId = params.get('qsid');

  const [phase, setPhase] = useState<Phase>('lobby');
  const [category, setCategory] = useState(decodeURIComponent(params.get('cat') ?? ''));
  const [QUESTION_TIME, setQuestionTime] = useState(params.get('timer') === '15' ? 15 : 30);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  // Seed from URL param so the share button is available immediately
  const [roomCode, setRoomCode] = useState(params.get('rc') ?? '');
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
  const [linkCopied, setLinkCopied] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [error, setError] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(Date.now());

  const triggerMascot = (mood: MascotMood) => {
    setMascotMood(mood);
    setMascotKey(k => k + 1);
  };

  // Poll room state during lobby: keeps player list fresh and detects game start
  useEffect(() => {
    if (phase !== 'lobby' || !roomId) return;

    const fetchRoom = () =>
      api.get<{ room_code: string; status: string; players: RoomPlayer[]; category: string; timer_seconds?: number }>(`/rooms/${roomId}`)
        .then(data => {
          if (data.room_code) setRoomCode(data.room_code);
          if (data.category) setCategory(data.category);
          if (data.timer_seconds) setQuestionTime(data.timer_seconds);
          setPlayers(data.players ?? []);
          if (data.status === 'active') setPhase('loading');
        }).catch(console.error);

    fetchRoom();
    const interval = setInterval(fetchRoom, 2000);
    return () => clearInterval(interval);
  }, [phase, roomId]);

  // Connect WS for in-game real-time events (score updates, game over)
  useEffect(() => {
    if (!roomId) return;

    let dead = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
      if (dead) return;
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const username = storedUser ? (JSON.parse(storedUser) as { username: string }).username : '';
      const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const wsBase = import.meta.env.VITE_WS_URL ?? apiUrl.replace(/^http/, 'ws');
      const ws = new WebSocket(`${wsBase}/room-ws?token=${token}&roomId=${roomId}&username=${encodeURIComponent(username)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        // Keepalive ping every 25s to prevent proxy timeouts
        if (pingTimer) clearInterval(pingTimer);
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
        }, 25_000);
      };

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'game_started') setPhase('loading');
        if (msg.type === 'advance_question') {
          setCurrentIndex(msg.nextIndex);
          setPhase('playing');
          setSelectedAnswer(null);
          setLastCorrect(null);
          setMascotMood('thinking');
          setMascotKey(k => k + 1);
        }
        if (msg.type === 'sync_state') {
          // Reconnected mid-game — jump to the server's current question
          setCurrentIndex(msg.currentQuestion);
          if (msg.answered) {
            setPhase('answered');
          } else {
            setPhase('playing');
            setSelectedAnswer(null);
            setLastCorrect(null);
            setMascotMood('thinking');
            setMascotKey(k => k + 1);
          }
        }
        if (msg.type === 'score_update') setLeaderboard(msg.leaderboard);
        if (msg.type === 'room_finished') {
          setLeaderboard(msg.leaderboard);
          setPhase('finished');
          playGibberish('happy');
        }
      };

      ws.onclose = () => {
        if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
        if (!dead) reconnectTimer = setTimeout(connect, 2_000);
      };
    };

    connect();

    return () => {
      dead = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      wsRef.current?.close();
    };
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

  // Fallback poll: if WS advance_question or room_finished was missed, detect via REST every 3s
  useEffect(() => {
    if (phase !== 'answered' || !roomId) return;
    const poll = () =>
      api.get<{ status: string; currentQuestion: number | null; players: RoomPlayer[] }>(`/rooms/${roomId}`)
        .then(data => {
          if (data.status === 'finished') {
            const lb = [...(data.players ?? [])].sort((a, b) => b.score - a.score);
            setLeaderboard(lb);
            setPhase('finished');
            playGibberish('happy');
          } else if (data.currentQuestion !== null && data.currentQuestion > currentIndex) {
            setCurrentIndex(data.currentQuestion);
            setPhase('playing');
            setSelectedAnswer(null);
            setLastCorrect(null);
            setMascotMood('thinking');
            setMascotKey(k => k + 1);
          }
        }).catch(console.error);
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [phase, currentIndex, roomId]);

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
      // Advancement is now server-driven via the 'advance_question' WS event.
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

  const shareLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}/join/${roomCode}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
      })
      .catch(() => {
        // Clipboard API unavailable (non-HTTPS or blocked) — show URL as fallback
        window.prompt('Copy this invite link:', url);
      });
  };

  // ── LOBBY ──
  if (phase === 'lobby') {
    return (
      <div className="gradient-page-wrapper">
        <Sparkles />
        <div className="gradient-page">
          <button
            className="btn btn-icon"
            style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}
            onClick={() => navigate('/')}
          >✕</button>
          <div className="room-lobby">
            <h1 className="page-title text-center">🏠 Room Lobby</h1>

            {category && (() => {
              const theme = getCategoryTheme(category);
              return (
                <div className="lobby-category-badge" style={{ background: theme.gradient }}>
                  <span className="lobby-category-emoji">{theme.emoji}</span>
                  <span className="lobby-category-name">{category}</span>
                </div>
              );
            })()}

            <div className="room-code-display">
              <span className="room-code-label">Room Code</span>
              <span className="room-code-value">{roomCode}</span>
              <button className="btn btn-ghost btn-sm" onClick={copyCode}>{copied ? '✓ Copied' : 'Copy'}</button>
            </div>
            <button className="btn btn-ghost btn-block" onClick={shareLink} disabled={!roomCode} style={{ marginTop: '0.5rem' }}>
              {linkCopied ? '✓ Link Copied!' : '🔗 Copy Invite Link'}
            </button>
            <p className="text-muted text-center" style={{ marginTop: '0.4rem' }}>
              Friends click the link, pick a name, and join instantly — no account needed.
            </p>

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
    const topScore = leaderboard[0]?.score ?? 0;
    const isTie = leaderboard.filter(e => e.score === topScore).length > 1;
    const winner = isTie ? null : leaderboard[0];
    const isCurrentUserWinner = !isTie && winner?.username === user?.username;

    const bubbleText = isTie
      ? "It's a tie! 🤝"
      : isCurrentUserWinner
        ? 'You win! 🎉'
        : `${winner?.username} wins! 🏆`;
    const finalMood = isTie || isCurrentUserWinner ? 'celebrating' : 'thinking';

    return (
      <div className="game-gradient-wrapper">
        <Sparkles />
        <div className="game-over">
          <div className="game-over-mascot">
            <div className="speech-bubble">{bubbleText}</div>
            <PizzaMascot mood={finalMood} size={130} className={`mascot-${finalMood}`} />
          </div>

          {isTie ? (
            <div className="room-winner-banner room-winner-banner--tie">
              <span className="room-winner-crown">🤝</span>
              <span className="room-winner-label">It's a Tie!</span>
              <span className="room-winner-score">{topScore} pts each</span>
            </div>
          ) : winner && (
            <div className="room-winner-banner">
              <span className="room-winner-crown">👑</span>
              <span className="room-winner-name">{winner.username}</span>
              <span className="room-winner-score">{winner.score} pts</span>
            </div>
          )}

          <div className="room-leaderboard-final">
            <h2 className="leaderboard-title">Final Scores</h2>
            {leaderboard.map((entry, i) => (
              <div key={entry.username} className={`leaderboard-row rank-${i + 1}`}>
                <span className="lb-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                <span className="lb-name">
                  {entry.username}
                  {entry.username === user?.username && <span className="lb-you"> you</span>}
                </span>
                <span className="lb-score-pill">{entry.score} pts</span>
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
            <button className="btn btn-icon" onClick={() => navigate('/')}>✕</button>
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
              <button
                key={i}
                type="button"
                className={cls}
                onClick={(e) => { e.currentTarget.blur(); submitAnswer(answer); }}
                disabled={phase !== 'playing'}
              >
                {answer}
              </button>
            );
          })}

          {phase === 'answered' && (
            <p className="room-waiting-msg" style={{ marginTop: '1rem', textAlign: 'center' }}>
              Waiting for others…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
