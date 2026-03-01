import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

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

const QUESTION_TIME = 30;

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = params.get('mode') ?? 'async';
  const questionSetId = params.get('qsid');

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

  // Countdown timer
  useEffect(() => {
    if (phase !== 'playing') { if (timerRef.current) clearInterval(timerRef.current); return; }
    questionStartRef.current = Date.now();
    setTimeLeft(QUESTION_TIME);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          // Auto-submit timeout (0 points)
          submitAnswer('__timeout__', QUESTION_TIME);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, currentIndex]);

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

      if (result.gameComplete) {
        setFinalScores(prev => ({ ...prev, mine: result.totalScore ?? score }));
        if (mode === 'async') setPhase('finished');
        else setWaitingForOpponent(true);
      } else if (mode === 'async') {
        // Auto-advance after 1.5s in async mode
        setTimeout(() => {
          setCurrentIndex(i => i + 1);
          setPhase('playing');
          setSelectedAnswer(null);
          setLastResult(null);
        }, 1500);
      } else {
        setWaitingForOpponent(true);
      }
    } catch (err) {
      console.error(err);
    }
  }, [phase, currentIndex, gameId, mode, score]);

  if (phase === 'loading') return <div className="loading">Loading questions...</div>;

  if (phase === 'finished') {
    return (
      <div className="game-over">
        <h2>Game over</h2>
        <p className="final-score">Your score: <strong>{finalScores?.mine ?? score}</strong></p>
        {finalScores?.opponent !== undefined && (
          <p>Opponent score: <strong>{finalScores.opponent}</strong></p>
        )}
        {finalScores?.opponent !== undefined && (
          <p className="result">
            {(finalScores.mine ?? 0) > finalScores.opponent ? 'You win!' :
             (finalScores.mine ?? 0) < finalScores.opponent ? 'You lose.' : "It's a tie!"}
          </p>
        )}
        {mode === 'async' && !finalScores?.opponent && (
          <p className="waiting-msg">Waiting for your opponent to play (up to 24h).</p>
        )}
        <button onClick={() => navigate('/')}>Back to dashboard</button>
      </div>
    );
  }

  const question = questions[currentIndex];
  if (!question) return null;

  return (
    <div className="game-screen">
      <div className="game-header">
        <span>Question {currentIndex + 1} of {questions.length}</span>
        <span className={`timer ${timeLeft <= 10 ? 'urgent' : ''}`}>{timeLeft}s</span>
        <span>Score: {score}</span>
      </div>

      <div className="question-card">
        <span className="difficulty">{question.difficulty}</span>
        <p className="question-text">{question.question}</p>
      </div>

      <div className="answers">
        {question.all_answers.map((answer, i) => {
          let className = 'answer-btn';
          if (selectedAnswer) {
            if (answer === lastResult?.correctAnswer) className += ' correct';
            else if (answer === selectedAnswer && !lastResult?.isCorrect) className += ' wrong';
          }
          return (
            <button
              key={i}
              className={className}
              onClick={() => submitAnswer(answer)}
              disabled={phase !== 'playing'}
            >
              {answer}
            </button>
          );
        })}
      </div>

      {phase === 'answered' && lastResult && (
        <div className={`feedback ${lastResult.isCorrect ? 'correct' : 'wrong'}`}>
          {lastResult.isCorrect ? `+${lastResult.points} pts` : `Wrong — 0 pts`}
          {!lastResult.isCorrect && lastResult.correctAnswer && (
            <span> (correct: {lastResult.correctAnswer})</span>
          )}
        </div>
      )}

      {waitingForOpponent && (
        <p className="waiting-msg">
          Waiting for opponent...
          {opponentAnswered && ' (they answered)'}
        </p>
      )}
    </div>
  );
}
