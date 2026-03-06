import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, getAuthToken } from '../api/client';
import PizzaMascot, { MascotMood } from '../components/PizzaMascot';
import { colors, gradients } from '../theme';
import type { RootStackParamList } from '../../App';

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

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const WS_BASE = process.env.EXPO_PUBLIC_WS_URL ?? API_BASE.replace(/^https?/, m => m === 'https' ? 'wss' : 'ws');

export default function GameScreen({ route, navigation }: Props) {
  const { gameId, mode, questionSetId, timer: QUESTION_TIME } = route.params;
  const insets = useSafeAreaInsets();

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
  const [opponentQuit, setOpponentQuit] = useState(false);
  const [mascotMood, setMascotMood] = useState<MascotMood>('thinking');
  const [mascotKey, setMascotKey] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(Date.now());
  const wsRef = useRef<WebSocket | null>(null);

  const triggerMascot = (mood: MascotMood) => {
    setMascotMood(mood);
    setMascotKey(k => k + 1);
  };

  // Load questions
  useEffect(() => {
    api.get<{ questions: Question[] }>(`/questions/set/${questionSetId}`).then(data => {
      setQuestions(data.questions);
      setPhase('playing');
    }).catch(console.error);
  }, [questionSetId]);

  // WebSocket for sync mode
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

  // Auto-submit on timeout
  useEffect(() => {
    if (timeLeft === 0 && phase === 'playing') {
      submitAnswer('__timeout__', QUESTION_TIME);
    }
  }, [timeLeft]);

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
      triggerMascot(result.isCorrect ? 'celebrating' : 'wrong');

      if (result.gameComplete) {
        setFinalScores(prev => ({ ...prev, mine: result.totalScore ?? score }));
        if (mode === 'async') setPhase('finished');
        else setWaitingForOpponent(true);
      } else if (mode === 'async') {
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
      ]
    );
  };

  // Loading
  if (phase === 'loading') {
    return (
      <LinearGradient colors={gradients.game} style={s.center}>
        <ActivityIndicator color={colors.green} size="large" />
        <Text style={s.loadingText}>Loading questions...</Text>
      </LinearGradient>
    );
  }

  // Finished
  if (phase === 'finished') {
    const opponent = finalScores?.opponent;
    const mine = finalScores?.mine ?? score;
    const gameOutcome = opponent !== undefined
      ? mine > opponent ? 'win' : mine < opponent ? 'lose' : 'tie'
      : 'solo';

    const outcomeConfig: Record<string, { text: string; mood: MascotMood }> = {
      win:  { text: 'You Rock!!! 🤘', mood: 'celebrating' },
      lose: { text: 'You Suck 😝',    mood: 'wrong' },
      tie:  { text: "It's a Tie! 🤝", mood: 'happy' },
      solo: { text: 'Well played! 🍕', mood: 'celebrating' },
    };
    const outcomeText = opponentQuit ? 'Opponent quit! 🏆' : outcomeConfig[gameOutcome].text;
    const outcomeMood = opponentQuit ? 'celebrating' : outcomeConfig[gameOutcome].mood;

    return (
      <LinearGradient colors={gradients.game} style={s.flex}>
        <View style={[s.finishedContainer, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}>
          <View style={s.bubble}>
            <Text style={s.bubbleText}>{outcomeText}</Text>
          </View>
          <PizzaMascot mood={outcomeMood} size={130} />
          <Text style={s.finalScore}>Your score: <Text style={s.finalScoreBold}>{mine}</Text></Text>
          {opponent !== undefined && (
            <Text style={s.opponentScore}>Opponent score: <Text style={{ fontWeight: '700' }}>{opponent}</Text></Text>
          )}
          {mode === 'async' && opponent === undefined && (
            <Text style={s.waitingMsg}>Waiting for your opponent to play (up to 24h).</Text>
          )}
          <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={() => navigation.navigate('Dashboard')}>
            <Text style={s.btnGhostText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const question = questions[currentIndex];
  if (!question) return null;

  const progressPct = (currentIndex + 1) / questions.length;
  const isUrgent = timeLeft <= 10;

  return (
    <LinearGradient colors={gradients.game} style={s.flex}>
      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.quitBtn} onPress={handleQuit}>
          <Text style={s.quitBtnText}>✕</Text>
        </TouchableOpacity>

        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progressPct * 100}%` }]} />
        </View>

        <View style={[s.countdown, isUrgent && s.countdownUrgent]}>
          <Text style={[s.countdownText, isUrgent && s.countdownTextUrgent]}>{timeLeft}s</Text>
        </View>
      </View>

      {/* Meta row */}
      <View style={s.metaRow}>
        <View style={s.scorePill}>
          <Text style={s.scorePillText}>⭐ {score} pts</Text>
        </View>
        <Text style={s.qCounter}>{currentIndex + 1} / {questions.length}</Text>
      </View>

      {/* Question — scrollable so long questions don't overflow */}
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.questionScrollContent}
        scrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.questionText}>{question.question}</Text>
      </ScrollView>

      {/* Mascot */}
      <View style={s.mascotCenter}>
        <PizzaMascot key={mascotKey} mood={mascotMood} size={85} />
      </View>

      {/* Answers — fixed at bottom */}
      <View style={[s.answersWrap, { paddingBottom: insets.bottom + 16 }]}>
        {question.all_answers.map((answer, i) => {
          let ansStyle: object[] = [s.answerPill];
          // Only apply colours after the API has responded (lastResult set)
          if (selectedAnswer && lastResult) {
            if (answer === lastResult.correctAnswer) ansStyle = [s.answerPill, s.answerCorrect];
            else if (answer === selectedAnswer && !lastResult.isCorrect) ansStyle = [s.answerPill, s.answerWrong];
          }
          return (
            <TouchableOpacity
              key={i}
              style={ansStyle}
              onPress={() => submitAnswer(answer)}
              disabled={phase !== 'playing'}
              activeOpacity={0.75}
            >
              <Text style={s.answerText}>{answer}</Text>
            </TouchableOpacity>
          );
        })}

        {waitingForOpponent && (
          <Text style={s.waitingMsg}>
            Waiting for opponent…{opponentAnswered ? ' (they answered)' : ''}
          </Text>
        )}
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: colors.textMuted, fontSize: 16 },
  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8, gap: 12,
  },
  quitBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  quitBtnText: { color: colors.textMuted, fontSize: 14 },
  progressTrack: {
    flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.green, borderRadius: 3 },
  countdown: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10,
  },
  countdownUrgent: { backgroundColor: 'rgba(239,68,68,0.2)' },
  countdownText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  countdownTextUrgent: { color: colors.red },
  // Meta row
  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 8,
  },
  scorePill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  scorePillText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  qCounter: { color: colors.textMuted, fontSize: 13 },
  // Question
  questionScrollContent: {
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  questionText: { color: colors.textPrimary, fontSize: 19, fontWeight: '600', lineHeight: 28, textAlign: 'center' },
  // Mascot
  mascotCenter: { alignItems: 'center', paddingVertical: 8 },
  // Answers
  answersWrap: { paddingHorizontal: 16, gap: 10 },
  answerPill: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
  },
  answerCorrect: {
    backgroundColor: 'rgba(34,197,94,0.3)',
    borderColor: colors.green,
    borderWidth: 2,
  },
  answerWrong: {
    backgroundColor: 'rgba(239,68,68,0.3)',
    borderColor: colors.red,
    borderWidth: 2,
  },
  answerText: { color: colors.textPrimary, fontSize: 15, fontWeight: '500', textAlign: 'center' },
  waitingMsg: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 4 },
  // Finished
  finishedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  bubble: {
    backgroundColor: colors.surface,
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  bubbleText: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  finalScore: { color: colors.textPrimary, fontSize: 22, marginTop: 8 },
  finalScoreBold: { fontWeight: '800', color: colors.green },
  opponentScore: { color: colors.textMuted, fontSize: 16 },
  btn: { borderRadius: 12, padding: 14, alignItems: 'center', minWidth: 200 },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  btnGhostText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
});
