import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Share, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, getAuthToken } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import PizzaMascot, { MascotMood } from '../components/PizzaMascot';
import { colors, gradients } from '../theme';
import { getCategoryTheme, parseGradientColors } from '../utils/categoryThemes';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Room'>;

interface Question {
  question: string;
  difficulty: string;
  all_answers: string[];
}

interface RoomPlayer {
  playerId: string;
  username: string;
  score: number;
  finished: boolean;
  isHost?: boolean;
}

interface LeaderboardEntry {
  username: string;
  score: number;
  finished: boolean;
}

type Phase = 'lobby' | 'loading' | 'playing' | 'answered' | 'finished';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const WS_BASE = process.env.EXPO_PUBLIC_WS_URL ?? API_BASE.replace(/^https?/, m => m === 'https' ? 'wss' : 'ws');
const WEB_BASE = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://quizza.vercel.app';

export default function RoomScreen({ route, navigation }: Props) {
  const { roomId, questionSetId, isHost, timer: QUESTION_TIME } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [phase, setPhase] = useState<Phase>('lobby');
  const [category, setCategory] = useState(route.params.category);
  const [roomCode, setRoomCode] = useState(route.params.roomCode);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
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

  // Poll room state during lobby
  useEffect(() => {
    if (phase !== 'lobby' || !roomId) return;
    const fetchRoom = () =>
      api.get<{ room_code: string; status: string; players: RoomPlayer[]; category: string; timer_seconds?: number }>(
        `/rooms/${roomId}`
      ).then(data => {
        if (data.room_code) setRoomCode(data.room_code);
        if (data.category) setCategory(data.category);
        setPlayers(data.players ?? []);
        if (data.status === 'active') setPhase('loading');
      }).catch(console.error);

    fetchRoom();
    const interval = setInterval(fetchRoom, 2000);
    return () => clearInterval(interval);
  }, [phase, roomId]);

  // WebSocket for real-time game events
  useEffect(() => {
    if (!roomId) return;
    let dead = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
      if (dead) return;
      const token = getAuthToken();
      const username = user?.username ?? '';
      const ws = new WebSocket(
        `${WS_BASE}/room-ws?token=${token}&roomId=${roomId}&username=${encodeURIComponent(username)}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
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
          setCurrentIndex(msg.currentQuestion);
          setPhase(msg.answered ? 'answered' : 'playing');
          if (!msg.answered) {
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
  }, [roomId, user?.username]);

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
  }, [timeLeft]);

  // Fallback poll when answered (in case WS advance_question is missed)
  useEffect(() => {
    if (phase !== 'answered' || !roomId) return;
    const poll = () =>
      api.get<{ status: string; currentQuestion: number | null; players: RoomPlayer[] }>(`/rooms/${roomId}`)
        .then(data => {
          if (data.status === 'finished') {
            const lb = [...(data.players ?? [])].sort((a, b) => b.score - a.score);
            setLeaderboard(lb);
            setPhase('finished');
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
    } catch (err) {
      console.error(err);
    }
  }, [phase, currentIndex, roomId]);

  const startGame = async () => {
    if (!roomId) return;
    setStartLoading(true);
    try {
      await api.post(`/rooms/${roomId}/start`, {});
      setPhase('loading');
    } catch (err: any) {
      setError(err.message);
      setStartLoading(false);
    }
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareRoom = async () => {
    const inviteUrl = `${WEB_BASE}/join/${roomCode}`;
    await Share.share({
      message: `Join my Quizza room! Code: ${roomCode}\n${inviteUrl}`,
      title: 'Join my Quizza room!',
    });
  };

  // ── LOBBY ──
  if (phase === 'lobby') {
    const theme = getCategoryTheme(category);
    const [c1, c2] = parseGradientColors(theme.gradient);
    return (
      <LinearGradient colors={gradients.bg} style={s.flex}>
        <ScrollView contentContainerStyle={[s.lobbyContainer, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity style={[s.closeBtn, { top: insets.top + 12 }]} onPress={() => navigation.navigate('Dashboard')}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <Text style={s.lobbyTitle}>Room Lobby</Text>

          {category ? (
            <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.categoryBadge}>
              <Text style={s.categoryEmoji}>{theme.emoji}</Text>
              <Text style={s.categoryName}>{category}</Text>
            </LinearGradient>
          ) : null}

          <View style={s.codeBox}>
            <Text style={s.codeLabel}>Room Code</Text>
            <Text style={s.codeValue}>{roomCode}</Text>
            <TouchableOpacity style={s.copyBtn} onPress={copyCode}>
              <Text style={s.copyBtnText}>{copied ? '✓ Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.shareRow}>
            <TouchableOpacity style={[s.shareBtn, s.flex1]} onPress={shareRoom}>
              <Text style={s.shareBtnText}>📤 Share Invite</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.shareHint}>Friends can join via the link — no account needed.</Text>

          <View style={s.playerList}>
            <Text style={s.playerListTitle}>Players ({players.length})</Text>
            {players.map((p, i) => (
              <View key={p.playerId ?? i} style={s.playerRow}>
                <Text style={s.playerRank}>{i + 1}</Text>
                <Text style={s.playerName}>{p.username}{p.isHost ? ' 👑' : ''}</Text>
              </View>
            ))}
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}

          {isHost ? (
            <TouchableOpacity
              style={[s.startBtn, (startLoading || players.length < 1) && s.startBtnDisabled]}
              onPress={startGame}
              disabled={startLoading || players.length < 1}
            >
              {startLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.startBtnText}>Start Game</Text>}
            </TouchableOpacity>
          ) : (
            <View style={s.waitingBox}>
              <Text style={s.waitingText}>Waiting for host to start...</Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    );
  }

  // ── LOADING ──
  if (phase === 'loading') {
    return (
      <LinearGradient colors={gradients.game} style={s.center}>
        <ActivityIndicator color={colors.green} size="large" />
        <Text style={s.loadingText}>Loading questions...</Text>
      </LinearGradient>
    );
  }

  // ── FINISHED ──
  if (phase === 'finished') {
    const topScore = leaderboard[0]?.score ?? 0;
    const isTie = leaderboard.filter(e => e.score === topScore).length > 1;
    const winner = isTie ? null : leaderboard[0];
    const isCurrentUserWinner = !isTie && winner?.username === user?.username;
    const bubbleText = isTie ? "It's a tie! 🤝" : isCurrentUserWinner ? 'You win! 🎉' : `${winner?.username} wins! 🏆`;
    const finalMood: MascotMood = isTie || isCurrentUserWinner ? 'celebrating' : 'thinking';

    return (
      <LinearGradient colors={gradients.game} style={s.flex}>
        <ScrollView contentContainerStyle={[s.finishedContainer, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
          <View style={s.bubble}>
            <Text style={s.bubbleText}>{bubbleText}</Text>
          </View>
          <PizzaMascot mood={finalMood} size={120} />

          {isTie ? (
            <View style={[s.winnerBanner, s.winnerBannerTie]}>
              <Text style={s.winnerCrown}>🤝</Text>
              <Text style={s.winnerLabel}>It's a Tie!</Text>
              <Text style={s.winnerScore}>{topScore} pts each</Text>
            </View>
          ) : winner ? (
            <View style={s.winnerBanner}>
              <Text style={s.winnerCrown}>👑</Text>
              <Text style={s.winnerName}>{winner.username}</Text>
              <Text style={s.winnerScore}>{winner.score} pts</Text>
            </View>
          ) : null}

          <Text style={s.lbTitle}>Final Scores</Text>
          {leaderboard.map((entry, i) => (
            <View key={entry.username} style={[s.lbRow, i === 0 && s.lbRowFirst]}>
              <Text style={s.lbRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</Text>
              <Text style={s.lbName}>
                {entry.username}
                {entry.username === user?.username ? <Text style={s.lbYou}> (you)</Text> : null}
              </Text>
              <View style={s.lbScorePill}>
                <Text style={s.lbScoreText}>{entry.score} pts</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={() => navigation.navigate('Dashboard')}>
            <Text style={s.btnGhostText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    );
  }

  // ── PLAYING / ANSWERED ──
  const question = questions[currentIndex];
  if (!question) return null;

  const progressPct = (currentIndex + 1) / questions.length;
  const isUrgent = timeLeft <= 10;

  return (
    <LinearGradient colors={gradients.game} style={s.flex}>
      {/* Leaderboard strip */}
      {leaderboard.length > 0 && (
        <View style={[s.scoreStrip, { paddingTop: insets.top + 4 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scoreStripInner}>
            {leaderboard.slice(0, 4).map((entry, i) => (
              <View key={entry.username} style={s.scoreChip}>
                <Text style={s.scoreChipText}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {entry.username} {entry.score}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.quitBtn} onPress={() => navigation.navigate('Dashboard')}>
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

      {/* Question */}
      <View style={s.questionWrap}>
        <Text style={s.questionText}>{question.question}</Text>
      </View>

      {/* Mascot */}
      <View style={s.mascotCenter}>
        <PizzaMascot key={mascotKey} mood={mascotMood} size={90} />
      </View>

      {/* Answers */}
      <View style={[s.answersWrap, { paddingBottom: insets.bottom + 16 }]}>
        {question.all_answers.map((answer, i) => {
          let ansStyle = [s.answerPill];
          if (selectedAnswer) {
            if (lastCorrect === true && answer === selectedAnswer) ansStyle = [s.answerPill, s.answerCorrect];
            else if (lastCorrect === false && answer === selectedAnswer) ansStyle = [s.answerPill, s.answerWrong];
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

        {phase === 'answered' && (
          <Text style={s.waitingMsg}>Waiting for others...</Text>
        )}
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  flex1: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: colors.textMuted, fontSize: 16 },
  // Lobby
  lobbyContainer: { padding: 20, gap: 16, alignItems: 'stretch' },
  closeBtn: { position: 'absolute', right: 20, zIndex: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: colors.textPrimary, fontSize: 16 },
  lobbyTitle: { color: colors.textPrimary, fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 36 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, padding: 14 },
  categoryEmoji: { fontSize: 28 },
  categoryName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  codeBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  codeLabel: { color: colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  codeValue: { color: colors.textPrimary, fontSize: 36, fontWeight: '800', letterSpacing: 6 },
  copyBtn: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  copyBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  shareRow: { flexDirection: 'row', gap: 10 },
  shareBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  shareBtnText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  shareHint: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  playerList: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border },
  playerListTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playerRank: { color: colors.textMuted, fontSize: 14, width: 20 },
  playerName: { color: colors.textPrimary, fontSize: 15, fontWeight: '500' },
  error: { color: colors.red, fontSize: 14, textAlign: 'center' },
  startBtn: { backgroundColor: colors.cyan, borderRadius: 14, padding: 16, alignItems: 'center' },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  waitingBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  waitingText: { color: colors.textMuted, fontSize: 15 },
  // Score strip
  scoreStrip: { backgroundColor: 'rgba(0,0,0,0.3)', paddingBottom: 6 },
  scoreStripInner: { paddingHorizontal: 16, gap: 8 },
  scoreChip: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  scoreChipText: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
  // Game top bar
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  quitBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  quitBtnText: { color: colors.textMuted, fontSize: 14 },
  progressTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.cyan, borderRadius: 3 },
  countdown: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  countdownUrgent: { backgroundColor: 'rgba(239,68,68,0.2)' },
  countdownText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  countdownTextUrgent: { color: colors.red },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  scorePill: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  scorePillText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  qCounter: { color: colors.textMuted, fontSize: 13 },
  questionWrap: { paddingHorizontal: 20, marginBottom: 8 },
  questionText: { color: colors.textPrimary, fontSize: 17, fontWeight: '600', lineHeight: 25, textAlign: 'center' },
  mascotCenter: { alignItems: 'center', marginBottom: 4 },
  answersWrap: { paddingHorizontal: 16, gap: 8 },
  answerPill: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  answerCorrect: { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: colors.green },
  answerWrong: { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: colors.red },
  answerText: { color: colors.textPrimary, fontSize: 14, fontWeight: '500', textAlign: 'center' },
  waitingMsg: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 4 },
  // Finished
  finishedContainer: { alignItems: 'center', gap: 16, padding: 20 },
  bubble: { backgroundColor: colors.surface, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  bubbleText: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  winnerBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', alignSelf: 'stretch', justifyContent: 'center' },
  winnerBannerTie: { backgroundColor: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.3)' },
  winnerCrown: { fontSize: 24 },
  winnerLabel: { color: colors.textMuted, fontSize: 14 },
  winnerName: { color: colors.amber, fontSize: 20, fontWeight: '800' },
  winnerScore: { color: colors.textMuted, fontSize: 14 },
  lbTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', alignSelf: 'flex-start' },
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, alignSelf: 'stretch', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  lbRowFirst: { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' },
  lbRank: { fontSize: 20, width: 30 },
  lbName: { flex: 1, color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  lbYou: { color: colors.textMuted, fontSize: 13, fontWeight: '400' },
  lbScorePill: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  lbScoreText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  btn: { borderRadius: 12, padding: 14, alignItems: 'center', minWidth: 200 },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  btnGhostText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
});
