import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import PizzaMascot from '../components/PizzaMascot';
import FloatingIcons from '../components/FloatingIcons';
import { getCategoryTheme } from '../utils/categoryThemes';
import { playGibberish } from '../utils/sounds';

interface Question {
  question: string;
  difficulty: string;
  all_answers: string[];
}

interface GameResult {
  isCorrect: boolean;
  points: number;
  correctAnswer?: string;
  totalScore?: number;
  gameComplete?: boolean;
}

type Phase = 'loading' | 'playing' | 'answered' | 'finished';
type MascotMood = 'thinking' | 'celebrating' | 'wrong';

const QUESTION_TIME = 30;

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = params.get('mode') ?? 'async';
  const questionSetId = params.get('qsid');
  const catName = params.get('cat') ?? '';
  const catId = params.get('catId') ? parseInt(params.get('catId')!) : undefined;

  const theme = getCategoryTheme(catName, catId);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [score, setScore] = useState(0);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [finalScores, setFinalScores] = useState<{ mine: number; opponent?: number } | null>(null);

  // Mascot reaction state — key increments to re-trigger CSS animation
  const [mascotMood, setMascotMood] = useState<MascotMood>('thinking');
  const [mascotKey, setMascotKey] = useState(0);

  const triggerMascot = (mood: MascotMood) => {
    setMascotMood(mood);
    setMascotKey(k => k + 1);
  };

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(Date.now());
  const wsRef = useRef<WebSocket | null>(null);

  // Load questions
  useEffect(() => {
    if (!questionSetId) return;
    api.get<{ questions: Question[] }>(`/questions/set/${questionSetId}`).then(data => {
      setQuestions(data.questions);
      setPhase('playing');
    });
  }, [questionSetId]);

  // WebSocket for sync mode
  useEffect(() => {
    if (mode !== 'sync' || !gameId) return;
    const token = localStorage.getItem('token');
    const wsUrl = `${(import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001')}/ws?token=${token}&gameId=${gameId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'opponent_answered') setOpponentAnswered(true);
      if (msg.type === 'advance') {
        setCurrentIndex(msg.question);
        setPhase('playing');
        setSelectedAnswer(null);
        setOpponentAnswered(false);
        setWaitingForOpponent(false);
        setTimeLeft(QUESTION_TIME);
        questionStartRef.current = Date.now();
        setMascotMood('thinking');
        setMascotKey(k => k + 1);
      }
      if (msg.type === 'opponent_finished') {
        setFinalScores(prev => ({ mine: prev?.mine ?? 0, opponent: msg.score }));
      }
      if (msg.type === 'game_over') {
        setPhase('finished');
      }
    };
    return () => ws.close();
  }, [mode, gameId]);

  // Countdown timer — updater must be pure, no side effects inside it
  useEffect(() => {
    if (phase !== 'playing') { if (timerRef.current) clearInterval(timerRef.current); return; }
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

  // Auto-submit when clock hits 0
  useEffect(() => {
    if (timeLeft === 0 && phase === 'playing') {
      submitAnswer('__timeout__', QUESTION_TIME);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Play gibberish when game ends
  useEffect(() => {
    if (phase !== 'finished') return;
    const opponent = finalScores?.opponent;
    const mine = finalScores?.mine ?? 0;
    const isWin = opponent !== undefined && mine > opponent;
    const isLose = opponent !== undefined && mine < opponent;
    setTimeout(() => playGibberish(isLose ? 'sad' : 'happy'), 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const submitAnswer = useCallback(async (answer: string, forcedTime?: number) => {
    if (phase !== 'playing') return;
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTaken = forcedTime ?? Math.round((Date.now() - questionStartRef.current) / 1000);
    setSelectedAnswer(answer);
    setPhase('answered');

    try {
      const result = await api.post<GameResult>(`/games/${gameId}/answer`, {
        questionIndex: currentIndex,
        selectedAnswer: answer === '__timeout__' ? '' : answer,
        timeTakenSeconds: Math.min(timeTaken, 30),
      });

      setLastResult(result);
      if (result.points) setScore(s => s + result.points);

      // Mascot reacts immediately
      triggerMascot(result.isCorrect ? 'celebrating' : 'wrong');

      if (result.gameComplete) {
        setFinalScores(prev => ({ ...prev, mine: result.totalScore ?? score }));
        if (mode === 'async') setPhase('finished');
        else setWaitingForOpponent(true);
      } else if (mode === 'async') {
        // Slightly longer delay so the player can enjoy the reaction
        setTimeout(() => {
          setCurrentIndex(i => i + 1);
          setPhase('playing');
          setSelectedAnswer(null);
          setLastResult(null);
          setMascotMood('thinking');
          setMascotKey(k => k + 1);
        }, 1800);
      } else {
        setWaitingForOpponent(true);
      }
    } catch (err) {
      console.error(err);
    }
  }, [phase, currentIndex, gameId, mode, score]);

  if (phase === 'loading') {
    return (
      <div className="game-gradient-wrapper" style={{ background: theme.gradient }}>
        <FloatingIcons emoji={theme.emoji} />
        <div className="loading">Loading questions...</div>
      </div>
    );
  }

  if (phase === 'finished') {
    const opponent = finalScores?.opponent;
    const mine = finalScores?.mine ?? score;
    const gameOutcome = opponent !== undefined
      ? mine > opponent ? 'win' : mine < opponent ? 'lose' : 'tie'
      : 'solo';

    const outcomeConfig: Record<string, { text: string; mood: 'celebrating' | 'wrong' | 'happy' }> = {
      win:  { text: 'You Rock!!! 🤘',  mood: 'celebrating' },
      lose: { text: 'You Suck 😝',      mood: 'wrong'       },
      tie:  { text: "It's a Tie! 🤝",  mood: 'happy'       },
      solo: { text: 'Well played! 🍕',  mood: 'celebrating' },
    };
    const { text: outcomeText, mood: outcomeMood } = outcomeConfig[gameOutcome];

    return (
      <div className="game-gradient-wrapper" style={{ background: theme.gradient }}>
        <FloatingIcons emoji={theme.emoji} />
        <div className="game-over">
          <div className="game-over-mascot">
            <div className="speech-bubble">{outcomeText}</div>
            <PizzaMascot
              mood={outcomeMood}
              size={130}
              className={outcomeMood === 'celebrating' ? 'mascot-celebrating' : outcomeMood === 'wrong' ? 'mascot-wrong' : 'mascot-float'}
            />
          </div>
          <p className="final-score">Your score: <strong>{mine}</strong></p>
          {opponent !== undefined && (
            <p>Opponent score: <strong>{opponent}</strong></p>
          )}
          {mode === 'async' && opponent === undefined && (
            <p className="waiting-msg">Waiting for your opponent to play (up to 24h).</p>
          )}
          <button onClick={() => navigate('/')}>Back to dashboard</button>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  if (!question) return null;

  return (
    <div className="game-gradient-wrapper" style={{ background: theme.gradient }}>
      <FloatingIcons emoji={theme.emoji} />
      <div className="game-screen" style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1rem' }}>
        <div className="game-header">
          <span>
            {theme.emoji && <span style={{ marginRight: '0.4rem' }}>{theme.emoji}</span>}
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className={`timer ${timeLeft <= 10 ? 'urgent' : ''}`}>{timeLeft}s</span>
          <span>Score: {score}</span>
        </div>

        <div className="question-card">
          <span className="difficulty">{question.difficulty}</span>
          <p className="question-text">{question.question}</p>
        </div>

        {/* Mascot below the question, reacts to answers */}
        <div className="mascot-reaction-area">
          <PizzaMascot
            key={mascotKey}
            mood={mascotMood}
            size={90}
            className={`mascot-${mascotMood}`}
          />
        </div>

        <div className="answers">
          {question.all_answers.map((answer, i) => {
            let cls = 'answer-btn';
            if (selectedAnswer) {
              if (answer === lastResult?.correctAnswer) cls += ' correct';
              else if (answer === selectedAnswer && !lastResult?.isCorrect) cls += ' wrong';
            }
            return (
              <button
                key={i}
                className={cls}
                onClick={() => submitAnswer(answer)}
                disabled={phase !== 'playing'}
              >
                {answer}
              </button>
            );
          })}
        </div>

        {waitingForOpponent && (
          <p className="waiting-msg">
            Waiting for opponent...{opponentAnswered && ' (they answered)'}
          </p>
        )}
      </div>
    </div>
  );
}
