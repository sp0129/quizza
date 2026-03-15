import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Alert, Dimensions,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  FadeIn,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
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
  opponentScore?: number;
}

type Phase = 'loading' | 'reading' | 'playing' | 'answered' | 'finished';
type AnswerState = 'neutral' | 'correct' | 'wrong' | 'dimmed';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const WS_BASE = process.env.EXPO_PUBLIC_WS_URL ?? API_BASE.replace(/^https?/, (m: string) => m === 'https' ? 'wss' : 'ws');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Read time: 3s question-only, then 0.6s stagger (4 × 200ms) + 0.2s settle = 3.8s before timer
const QUESTION_READ_MS = 3000;
const ANSWER_STAGGER_MS = 200;
const ANSWER_COUNT = 4;
const ANSWER_REVEAL_TOTAL_MS = ANSWER_STAGGER_MS * ANSWER_COUNT; // 800ms
const POST_REVEAL_SETTLE_MS = 200;

// Fixed layout heights to prevent question jitter
const QUESTION_AREA_HEIGHT = 140;
const ANSWER_AREA_HEIGHT = 320;

// ---------------------------------------------------------------------------
// Animated Score Display
// ---------------------------------------------------------------------------

function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (value === display) return;

    scale.value = withSequence(
      withSpring(1.2, { damping: 12, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );

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
// Sequential top-to-bottom reveal order (quiz show style)
// ---------------------------------------------------------------------------

function sequentialIndices(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i);
}

// ---------------------------------------------------------------------------
// Pop-in Answer Button wrapper (fade + scale, top-to-bottom stagger)
// ---------------------------------------------------------------------------

function PopInAnswerButton({
  answer,
  revealDelay,
  state,
  disabled,
  visible,
  onPress,
}: {
  answer: string;
  revealDelay: number;
  state: AnswerState;
  disabled: boolean;
  visible: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  // Track whether this button has started its reveal animation
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (visible) {
      // Delay mounting the AnswerButton until its stagger slot arrives
      const mountTimer = setTimeout(() => setRevealed(true), revealDelay);
      scale.value = withDelay(
        revealDelay,
        withSpring(1, { mass: 1, damping: 7, stiffness: 40 }),
      );
      opacity.value = withDelay(
        revealDelay,
        withTiming(1, { duration: 150 }),
      );
      return () => clearTimeout(mountTimer);
    } else {
      scale.value = 0.8;
      opacity.value = 0;
      setRevealed(false);
    }
  }, [visible, revealDelay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Reserve space with placeholder until reveal; prevents flash from
  // AnswerButton mounting before the wrapper's animated opacity takes effect
  if (!visible && !revealed) {
    return <View style={styles.answerPlaceholder} />;
  }

  return (
    <Animated.View style={[styles.answerSlot, animStyle]}>
      <AnswerButton
        text={answer}
        state={state}
        disabled={disabled}
        onPress={onPress}
      />
    </Animated.View>
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

  // --- Answer button visibility (random pop-in reveal) ---
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  // Per-question random reveal order: maps display slot → stagger delay index
  const [revealOrder, setRevealOrder] = useState<number[]>([0, 1, 2, 3]);

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
  const [questionAnimKey, setQuestionAnimKey] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(Date.now());
  const wsRef = useRef<WebSocket | null>(null);
  const readTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerMascot = (mood: MascotMood) => {
    setMascotMood(mood);
    setMascotKey(k => k + 1);
  };

  // --- Start the read → reveal → play sequence for each question ---
  const startQuestionSequence = useCallback(() => {
    setButtonsVisible(false);
    setTimerActive(false);
    setPhase('reading');
    // Shuffle reveal order for this question
    setRevealOrder(sequentialIndices(ANSWER_COUNT));

    // After 3s: reveal answer buttons with random pop-in
    readTimeoutRef.current = setTimeout(() => {
      setButtonsVisible(true);

      // After stagger completes + settle (0.8s + 0.2s = 1.0s): start the timer
      settleTimeoutRef.current = setTimeout(() => {
        setPhase('playing');
        setTimerActive(true);
        questionStartRef.current = Date.now();
      }, ANSWER_REVEAL_TOTAL_MS + POST_REVEAL_SETTLE_MS);
    }, QUESTION_READ_MS);
  }, []);

  // Clean up read/settle timeouts
  useEffect(() => {
    return () => {
      if (readTimeoutRef.current) clearTimeout(readTimeoutRef.current);
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    };
  }, []);

  // --- Load questions ---
  useEffect(() => {
    api.get<{ questions: Question[] }>(`/questions/set/${questionSetId}`).then(data => {
      setQuestions(data.questions);
      setQuestionResults(new Array(data.questions.length).fill(null));
      setTimerKey(k => k + 1);
      startQuestionSequence();
    }).catch(console.error);
  }, [questionSetId, startQuestionSequence]);

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
        setSelectedAnswer(null);
        setOpponentAnswered(false);
        setWaitingForOpponent(false);
        setTimeLeft(QUESTION_TIME);
        setLastResult(null);
        setTimerKey(k => k + 1);
        setQuestionAnimKey(k => k + 1);
        setMascotMood('thinking');
        setMascotKey(k => k + 1);
        startQuestionSequence();
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
  }, [mode, gameId, startQuestionSequence]);

  // --- Countdown timer (only when timerActive) ---
  useEffect(() => {
    if (!timerActive || phase !== 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimeLeft(QUESTION_TIME);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, phase, currentIndex]);

  // --- Haptic ticks in final 5 seconds ---
  useEffect(() => {
    if (timeLeft > 0 && timeLeft <= 5 && phase === 'playing') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [timeLeft, phase]);

  // --- Auto-submit on timeout ---
  useEffect(() => {
    if (timeLeft === 0 && phase === 'playing') {
      submitAnswer('__timeout__', QUESTION_TIME);
    }
  }, [timeLeft]);

  // --- Submit answer ---
  const submitAnswer = useCallback(async (answer: string, forcedTime?: number) => {
    if (phase !== 'playing' && phase !== 'reading') return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (readTimeoutRef.current) clearTimeout(readTimeoutRef.current);
    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);

    const timeTaken = forcedTime ?? Math.round((Date.now() - questionStartRef.current) / 1000);
    setSelectedAnswer(answer);
    setPhase('answered');
    setTimerActive(false);

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
        setFinalScores(prev => ({
          ...prev,
          mine: result.totalScore ?? score,
          ...(result.opponentScore !== undefined ? { opponent: result.opponentScore } : {}),
        }));
        if (mode !== 'sync') {
          setTimeout(() => setPhase('finished'), 1500);
        } else {
          setWaitingForOpponent(true);
        }
      } else if (mode !== 'sync') {
        // 1.5s pause on reveal state — long enough to register, short enough for flow
        setTimeout(() => {
          setCurrentIndex(i => i + 1);
          setSelectedAnswer(null);
          setLastResult(null);
          setTimerKey(k => k + 1);
          setQuestionAnimKey(k => k + 1);
          setMascotMood('thinking');
          setMascotKey(k => k + 1);
          startQuestionSequence();
        }, 1500);
      } else {
        setWaitingForOpponent(true);
      }
    } catch (err) {
      console.error(err);
    }
  }, [phase, currentIndex, gameId, mode, score, startQuestionSequence]);

  // --- Fetch opponent score on finish (fallback for async challenges) ---
  useEffect(() => {
    if (phase !== 'finished' || !gameId || finalScores?.opponent !== undefined) return;
    (async () => {
      try {
        const status = await api.get<{
          player_a_id: string; player_b_id: string;
          player_a_score: number | null; player_b_score: number | null;
        }>(`/games/${gameId}/status`);
        const raw = await SecureStore.getItemAsync('user');
        if (!raw) return;
        const me = JSON.parse(raw);
        const isPlayerA = status.player_a_id === me.id;
        const oppScore = isPlayerA ? status.player_b_score : status.player_a_score;
        if (oppScore !== null && oppScore !== undefined) {
          setFinalScores(prev => ({ mine: prev?.mine ?? 0, ...prev, opponent: oppScore }));
        }
      } catch {}
    })();
  }, [phase, gameId]);

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
            navigation.navigate('MainTabs');
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
  // RENDER: Finished → navigate to ResultsScreen
  // =========================================================================
  if (phase === 'finished') {
    const opponent = finalScores?.opponent;
    const mine = finalScores?.mine ?? score;

    // Challenger finished async game — opponent hasn't played yet.
    // Show score summary + send them back to Dashboard where they'll
    // see a "waiting" card that updates when the opponent finishes.
    if (mode === 'async' && opponent === undefined) {
      return (
        <LinearGradient colors={gradients.game} style={styles.flex}>
          <View style={[styles.finishedContainer, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}>
            <PizzaMascot mood="celebrating" size={130} />
            <Text style={styles.outcomeText}>Well played!</Text>

            <View style={styles.scoreCard}>
              <Text style={styles.scoreCardLabel}>Your Score</Text>
              <Text style={styles.scoreCardValue}>{mine}</Text>
            </View>

            <Text style={styles.waitingMsg}>
              Your opponent will be notified. You'll see results on your dashboard when they finish.
            </Text>

            <ProgressDots total={questions.length} current={-1} results={questionResults} />

            <Animated.View entering={FadeIn.delay(300)}>
              <TouchableOpacity
                style={styles.dashBtn}
                onPress={() => navigation.navigate('MainTabs')}
                activeOpacity={0.8}
              >
                <Text style={styles.dashBtnText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </LinearGradient>
      );
    }

    // Determine outcome and navigate to ResultsScreen
    const gameResult: 'win' | 'loss' | 'tie' = opponentQuit
      ? 'win'
      : opponent !== undefined
        ? mine > opponent
          ? 'win'
          : mine < opponent
            ? 'loss'
            : 'tie'
        : 'win'; // solo = always "win"

    const gameMode: 'challenge' | 'solo' | 'group' =
      mode === 'async' || mode === 'sync' ? 'challenge' : 'solo';

    // Navigate once (replace so user can't go back to game)
    navigation.replace('Results', {
      yourScore: mine,
      opponentScore: opponent,
      category: route.params.category ?? 'Trivia',
      gameMode,
      result: gameResult,
      timestamp: new Date().toISOString(),
    });

    // Render nothing while navigating
    return (
      <LinearGradient colors={gradients.game} style={styles.flex}>
        <View style={styles.center} />
      </LinearGradient>
    );
  }

  // =========================================================================
  // RENDER: Reading / Playing / Answered
  // =========================================================================
  const question = questions[currentIndex];
  if (!question) return null;

  const isReadingPhase = phase === 'reading';
  const canAnswer = phase === 'playing';

  return (
    <LinearGradient colors={gradients.game} style={styles.flex}>
      {/* ================================================================= */}
      {/* TOP ZONE: Status bar — progress, timer, score                     */}
      {/* ================================================================= */}
      <View style={[styles.topZone, { paddingTop: insets.top + 8 }]}>
        {/* Quit button */}
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.quitBtn} onPress={handleQuit}>
            <Text style={styles.quitBtnText}>✕</Text>
          </TouchableOpacity>

          {/* Progress dots */}
          <ProgressDots
            total={questions.length}
            current={currentIndex}
            results={questionResults}
          />

          {/* Score display */}
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Score</Text>
            <View style={styles.scoreRow}>
              <AnimatedScore value={score} />
              <FloatingPoints points={lastPoints} triggerKey={pointsTrigger} />
            </View>
          </View>
        </View>

        {/* Circular countdown timer */}
        <View style={styles.timerRow}>
          <CircularTimer
            duration={QUESTION_TIME}
            timeLeft={timeLeft}
            isPlaying={timerActive}
            timerKey={timerKey}
          />
        </View>
      </View>

      {/* ================================================================= */}
      {/* MIDDLE ZONE: Question text + mascot (fixed height)                */}
      {/* Question appears instantly, answers pop in 3s later               */}
      {/* ================================================================= */}
      <View style={styles.middleZone}>
        <View style={styles.questionArea}>
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
        </View>

        {/* Mascot */}
        <View style={styles.mascotWrap}>
          <PizzaMascot key={mascotKey} mood={mascotMood} size={60} />
        </View>
      </View>

      {/* ================================================================= */}
      {/* BOTTOM ZONE: Answer buttons with random pop-in reveal             */}
      {/* Pre-allocated fixed height prevents question jitter               */}
      {/* ================================================================= */}
      <View style={[styles.bottomZone, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.answerArea}>
          {question.all_answers.map((answer, i) => {
            // revealOrder[i] = which stagger position this slot gets
            const staggerIndex = revealOrder[i] ?? i;
            return (
              <PopInAnswerButton
                key={`${currentIndex}-${i}`}
                answer={answer}
                revealDelay={staggerIndex * ANSWER_STAGGER_MS}
                state={getAnswerState(answer)}
                disabled={!canAnswer}
                visible={buttonsVisible}
                onPress={() => submitAnswer(answer)}
              />
            );
          })}

          {/* Reading phase hint */}
          {isReadingPhase && !buttonsVisible && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.readingHint}>
              <Text style={styles.readingHintText}>Read the question...</Text>
            </Animated.View>
          )}
        </View>

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
  questionArea: {
    minHeight: QUESTION_AREA_HEIGHT,
    justifyContent: 'center',
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
    fontSize: 21,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 32,
  },
  mascotWrap: {
    alignItems: 'center',
    marginTop: 12,
  },

  // === BOTTOM ZONE ===
  bottomZone: {
    paddingHorizontal: 16,
  },
  answerArea: {
    minHeight: ANSWER_AREA_HEIGHT,
    justifyContent: 'flex-end',
    gap: 12,
  },
  answerSlot: {
    // Each slot reserves space even when invisible (opacity 0, scale 0.8)
  },
  answerPlaceholder: {
    minHeight: 60,
  },
  readingHint: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  readingHintText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
    fontStyle: 'italic',
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
