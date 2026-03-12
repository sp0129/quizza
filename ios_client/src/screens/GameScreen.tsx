import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  FadeIn,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { api, getAuthToken } from '../api/client';
import PizzaMascot, { MascotMood } from '../components/PizzaMascot';
import AnswerButton from '../components/AnswerButton';
import CircularTimer from '../components/CircularTimer';
import { colors, gradients } from '../theme/colors';
import type { RootStackParamList } from '../../App';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

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
type AnswerState = 'neutral' | 'correct' | 'wrong' | 'dimmed';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const WS_BASE = process.env.EXPO_PUBLIC_WS_URL ?? API_BASE.replace(/^https?/, (m: string) => m === 'https' ? 'wss' : 'ws');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Animated Score Display
// ---------------------------------------------------------------------------
// Animates a count-up from old to new value with a brief scale pulse (1.0→1.2→1.0)
// to draw the eye when points are awarded. Uses tabular-nums to prevent layout shift.

function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (value === display) return;

    // Pulse scale 1.0 → 1.2 → 1.0 over 300ms
    scale.value = withSequence(
      withSpring(1.2, { damping: 12, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );

    // Count-up animation over 200ms
    const start = display;
    const diff = value - start;
    const steps = 10;
    const stepTime = 200 / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      setDisplay(Math.round(start + (diff * step) / steps));
      if (step >= steps) {
        clearInterval(interval);
        setDisplay(value);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [value]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text style={[styles.scoreValue, animStyle]}>
      {display}
    </Animated.Text>
  );
}

// ---------------------------------------------------------------------------
// Floating Points Indicator
// ---------------------------------------------------------------------------
// Shows "+N" that floats upward and fades out when points are awarded.

function FloatingPoints({ points, triggerKey }: { points: number; triggerKey: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (triggerKey === 0 || points === 0) return;
    translateY.value = 0;
    opacity.value = 1;
    translateY.value = withTiming(-30, { duration: 800 });
    opacity.value = withTiming(0, { duration: 800 });
  }, [triggerKey]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (triggerKey === 0) return null;

  return (
    <Animated.Text style={[styles.floatingPoints, style]}>
      +{points}
    </Animated.Text>
  );
}

// ---------------------------------------------------------------------------
// Progress Dots
// ---------------------------------------------------------------------------
// Segmented progress indicator (one dot per question) — recommended in uiux.md
// for quizzes under 20 questions. Filled = answered, current = pulsing accent.

function ProgressDots({ total, current, results }: {
  total: number;
  current: number;
  results: (boolean | null)[];
}) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }, (_, i) => {
        let dotColor = colors.bg.elevated;
        if (results[i] === true) dotColor = colors.correct;
        else if (results[i] === false) dotColor = colors.wrong;
        else if (i === current) dotColor = colors.button;

        return (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: dotColor },
              i === current && styles.dotCurrent,
            ]}
          />
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main GameScreen Component
// ---------------------------------------------------------------------------

export default function GameScreen({ route, navigation }: Props) {
  const { gameId, mode, questionSetId, timer: QUESTION_TIME } = route.params;
  const insets = useSafeAreaInsets();

  // --- Core game state ---
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [score, setScore] = useState(0);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [questionResults, setQuestionResults] = useState<(boolean | null)[]>([]);

  // --- Sync mode state ---
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [finalScores, setFinalScores] = useState<{ mine: number; opponent?: number } | null>(null);
  const [opponentQuit, setOpponentQuit] = useState(false);

  // --- Visual state ---
  const [mascotMood, setMascotMood] = useState<MascotMood>('thinking');
  const [mascotKey, setMascotKey] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const [lastPoints, setLastPoints] = useState(0);
  const [pointsTrigger, setPointsTrigger] = useState(0);

  // --- Animation: question slide transition ---
  // We use a key-based approach with Reanimated layout animations:
  // current question exits via SlideOutLeft, new one enters via SlideInRight (250ms)
  const [questionAnimKey, setQuestionAnimKey] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(Date.now());
  const wsRef = useRef<WebSocket | null>(null);

  const triggerMascot = (mood: MascotMood) => {
    setMascotMood(mood);
    setMascotKey(k => k + 1);
  };

  // --- Load questions ---
  useEffect(() => {
    api.get<{ questions: Question[] }>(`/questions/set/${questionSetId}`).then(data => {
      setQuestions(data.questions);
      setQuestionResults(new Array(data.questions.length).fill(null));
      setPhase('playing');
      setTimerKey(k => k + 1);
    }).catch(console.error);
  }, [questionSetId]);

  // --- WebSocket for sync mode ---
  useEffect(() => {
    if (mode !== 'sync' || !gameId) return;
    const token = getAuthToken();
    const ws = new WebSocket(`${WS_BASE}/ws?token=${token}&gameId=${gameId}`);
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
        setLastResult(null);
        setTimerKey(k => k + 1);
        setQuestionAnimKey(k => k + 1);
        questionStartRef.current = Date.now();
        setMascotMood('thinking');
        setMascotKey(k => k + 1);
      }
      if (msg.type === 'opponent_finished') {
        setFinalScores(prev => ({ mine: prev?.mine ?? 0, opponent: msg.score }));
      }
      if (msg.type === 'game_over') setPhase('finished');
      if (msg.type === 'opponent_quit') {
        setFinalScores({ mine: msg.myScore, opponent: 0 });
        setOpponentQuit(true);
        setPhase('finished');
      }
    };
    return () => ws.close();
  }, [mode, gameId]);

  // --- Countdown timer ---
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

  // --- Auto-submit on timeout ---
  useEffect(() => {
    if (timeLeft === 0 && phase === 'playing') {
      submitAnswer('__timeout__', QUESTION_TIME);
    }
  }, [timeLeft]);

  // --- Submit answer ---
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

      // Update score with floating points animation
      if (result.points) {
        setScore(s => s + result.points);
        setLastPoints(result.points);
        setPointsTrigger(k => k + 1);
      }

      // Record result for progress dots
      setQuestionResults(prev => {
        const next = [...prev];
        next[currentIndex] = result.isCorrect;
        return next;
      });

      triggerMascot(result.isCorrect ? 'celebrating' : 'wrong');

      if (result.gameComplete) {
        setFinalScores(prev => ({ ...prev, mine: result.totalScore ?? score }));
        if (mode === 'async') {
          setTimeout(() => setPhase('finished'), 1500);
        } else {
          setWaitingForOpponent(true);
        }
      } else if (mode === 'async') {
        // 1.5s pause on reveal state — long enough to register, short enough for flow
        setTimeout(() => {
          setCurrentIndex(i => i + 1);
          setPhase('playing');
          setSelectedAnswer(null);
          setLastResult(null);
          setTimerKey(k => k + 1);
          setQuestionAnimKey(k => k + 1);
          setMascotMood('thinking');
          setMascotKey(k => k + 1);
        }, 1500);
      } else {
        setWaitingForOpponent(true);
      }
    } catch (err) {
      console.error(err);
    }
  }, [phase, currentIndex, gameId, mode, score]);

  // --- Quit handler ---
  const handleQuit = () => {
    Alert.alert(
      'Quit game?',
      mode === 'sync' ? 'Your opponent will win the match.' : "You'll be registered as a loss.",
      [
        { text: 'Keep playing', style: 'cancel' },
        {
          text: 'Quit', style: 'destructive',
          onPress: async () => {
            try { await api.post(`/games/${gameId}/quit`, {}); } catch {}
            navigation.navigate('Dashboard');
          },
        },
      ],
    );
  };

  // --- Determine answer button states ---
  const getAnswerState = (answer: string): AnswerState => {
    if (!selectedAnswer || !lastResult) return 'neutral';
    if (answer === lastResult.correctAnswer) return 'correct';
    if (answer === selectedAnswer && !lastResult.isCorrect) return 'wrong';
    return 'dimmed';
  };

  // =========================================================================
  // RENDER: Loading
  // =========================================================================
  if (phase === 'loading') {
    return (
      <LinearGradient colors={gradients.game} style={styles.flex}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.button} size="large" />
          <Text style={styles.loadingText}>Loading questions…</Text>
        </View>
      </LinearGradient>
    );
  }

  // =========================================================================
  // RENDER: Finished (leaderboard)
  // =========================================================================
  if (phase === 'finished') {
    const opponent = finalScores?.opponent;
    const mine = finalScores?.mine ?? score;
    const gameOutcome = opponent !== undefined
      ? mine > opponent ? 'win' : mine < opponent ? 'lose' : 'tie'
      : 'solo';

    const outcomeConfig: Record<string, { text: string; mood: MascotMood }> = {
      win:  { text: 'You Rock!!!', mood: 'celebrating' },
      lose: { text: 'Better luck next time!', mood: 'wrong' },
      tie:  { text: "It's a Tie!", mood: 'happy' },
      solo: { text: 'Well played!', mood: 'celebrating' },
    };
    const outcomeText = opponentQuit ? 'Opponent quit!' : outcomeConfig[gameOutcome].text;
    const outcomeMood = opponentQuit ? 'celebrating' : outcomeConfig[gameOutcome].mood;

    return (
      <LinearGradient colors={gradients.game} style={styles.flex}>
        <View style={[styles.finishedContainer, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}>
          <PizzaMascot mood={outcomeMood} size={130} />
          <Text style={styles.outcomeText}>{outcomeText}</Text>

          <View style={styles.scoreCard}>
            <Text style={styles.scoreCardLabel}>Your Score</Text>
            <Text style={styles.scoreCardValue}>{mine}</Text>
          </View>

          {opponent !== undefined && (
            <View style={[styles.scoreCard, styles.scoreCardOpponent]}>
              <Text style={styles.scoreCardLabel}>Opponent</Text>
              <Text style={styles.scoreCardValue}>{opponent}</Text>
            </View>
          )}

          {mode === 'async' && opponent === undefined && (
            <Text style={styles.waitingMsg}>
              Waiting for your opponent to play (up to 24h).
            </Text>
          )}

          {/* Progress dots showing per-question results */}
          <ProgressDots total={questions.length} current={-1} results={questionResults} />

          <Animated.View entering={FadeIn.delay(300)}>
            <View style={styles.dashBtn}>
              <Text
                style={styles.dashBtnText}
                onPress={() => navigation.navigate('Dashboard')}
              >
                Back to Dashboard
              </Text>
            </View>
          </Animated.View>
        </View>
      </LinearGradient>
    );
  }

  // =========================================================================
  // RENDER: Playing / Answered
  // =========================================================================
  const question = questions[currentIndex];
  if (!question) return null;

  return (
    <LinearGradient colors={gradients.game} style={styles.flex}>
      {/* ================================================================= */}
      {/* TOP ZONE (~15%): Status bar — progress, timer, score              */}
      {/* Three-zone layout per uiux.md. Compact, persistent, never         */}
      {/* competes with question content.                                    */}
      {/* ================================================================= */}
      <View style={[styles.topZone, { paddingTop: insets.top + 8 }]}>
        {/* Quit button */}
        <View style={styles.topRow}>
          <View style={styles.quitBtn} >
            <Text style={styles.quitBtnText} onPress={handleQuit}>✕</Text>
          </View>

          {/* Progress dots — segmented indicator, one per question */}
          <ProgressDots
            total={questions.length}
            current={currentIndex}
            results={questionResults}
          />

          {/* Score display with animated count-up and floating +N */}
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Score</Text>
            <View style={styles.scoreRow}>
              <AnimatedScore value={score} />
              <FloatingPoints points={lastPoints} triggerKey={pointsTrigger} />
            </View>
          </View>
        </View>

        {/* Circular countdown timer — center of top zone */}
        <View style={styles.timerRow}>
          <CircularTimer
            duration={QUESTION_TIME}
            timeLeft={timeLeft}
            isPlaying={phase === 'playing'}
            timerKey={timerKey}
          />
        </View>
      </View>

      {/* ================================================================= */}
      {/* MIDDLE ZONE (~35%): Question text + question counter              */}
      {/* Large, bold, centered text with 1.5x line height.                 */}
      {/* Animated: slides out left / in from right on question change.     */}
      {/* ================================================================= */}
      <View style={styles.middleZone}>
        <Animated.View
          key={questionAnimKey}
          entering={SlideInRight.duration(250)}
          exiting={SlideOutLeft.duration(250)}
          style={styles.questionContainer}
        >
          <Text style={styles.questionCounter}>
            Question {currentIndex + 1} of {questions.length}
          </Text>
          <Text style={styles.questionText}>{question.question}</Text>
        </Animated.View>

        {/* Mascot — small, positioned to add personality without distraction */}
        <View style={styles.mascotWrap}>
          <PizzaMascot key={mascotKey} mood={mascotMood} size={60} />
        </View>
      </View>

      {/* ================================================================= */}
      {/* BOTTOM ZONE (~50%): Answer buttons                                */}
      {/* Four full-width buttons, 12dp spacing, in the natural thumb arc.  */}
      {/* Each button handles its own press/reveal/shake animations.        */}
      {/* ================================================================= */}
      <View style={[styles.bottomZone, { paddingBottom: insets.bottom + 20 }]}>
        {question.all_answers.map((answer, i) => (
          <AnswerButton
            key={`${currentIndex}-${i}`}
            text={answer}
            state={getAnswerState(answer)}
            disabled={phase !== 'playing'}
            onPress={() => submitAnswer(answer)}
          />
        ))}

        {waitingForOpponent && (
          <Text style={styles.waitingMsg}>
            Waiting for opponent…{opponentAnswered ? ' (they answered)' : ''}
          </Text>
        )}
      </View>
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: colors.text.secondary, fontSize: 16, marginTop: 8 },

  // === TOP ZONE ===
  topZone: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  quitBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bg.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  quitBtnText: { color: colors.text.secondary, fontSize: 16, fontWeight: '600' },

  // Progress dots
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
  },
  dotCurrent: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.text.primary,
  },

  // Score
  scoreContainer: {
    alignItems: 'center',
    minWidth: 50,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreValue: {
    // Monospace/tabular-nums prevents layout shift when score changes
    fontVariant: ['tabular-nums'],
    fontSize: 18,
    fontWeight: '800',
    color: colors.gold,
  },
  floatingPoints: {
    position: 'absolute',
    right: -28,
    top: -4,
    fontSize: 13,
    fontWeight: '700',
    color: colors.correct,
  },

  // Timer row
  timerRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },

  // === MIDDLE ZONE ===
  middleZone: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  questionContainer: {
    alignItems: 'center',
  },
  questionCounter: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  questionText: {
    // 20-22px bold per typography spec, 1.5x line height, centered
    fontSize: 21,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 32,       // ~1.5x of 21px
  },
  mascotWrap: {
    alignItems: 'center',
    marginTop: 12,
  },

  // === BOTTOM ZONE ===
  bottomZone: {
    paddingHorizontal: 16,
    gap: 12,              // 12dp spacing between answer buttons per spec
  },

  // === FINISHED SCREEN ===
  finishedContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 24, gap: 16,
  },
  outcomeText: {
    fontSize: 26, fontWeight: '800',
    color: colors.text.primary,
    marginTop: 12,
  },
  scoreCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: 16, padding: 20,
    alignItems: 'center', minWidth: 160,
    borderWidth: 1, borderColor: colors.correct,
  },
  scoreCardOpponent: {
    borderColor: colors.bg.elevated,
  },
  scoreCardLabel: {
    fontSize: 13, fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreCardValue: {
    fontSize: 36, fontWeight: '800',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  dashBtn: {
    backgroundColor: colors.button,
    borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32,
    marginTop: 8,
  },
  dashBtnText: {
    color: colors.text.onButton, fontSize: 16, fontWeight: '700',
  },
  waitingMsg: {
    color: colors.text.secondary, fontSize: 14,
    textAlign: 'center', marginTop: 4,
  },
});
