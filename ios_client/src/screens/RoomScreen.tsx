import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Share, ActivityIndicator, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  FadeIn,
  FadeInDown,
  SlideInRight,
  SlideOutLeft,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, getAuthToken } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import PizzaMascot, { MascotMood } from '../components/PizzaMascot';
import AnswerButton from '../components/AnswerButton';
import CircularTimer from '../components/CircularTimer';
import { colors, gradients } from '../theme';
import { getCategoryTheme, parseGradientColors } from '../utils/categoryThemes';
import { playSound } from '../utils/sounds';
import { startLobbyMusic, stopLobbyMusic } from '../utils/lobbyMusic';
import FloatingParticles from '../components/lobby/FloatingParticles';
import LobbyMascot from '../components/lobby/LobbyMascot';
import JoinBurst from '../components/lobby/JoinBurst';
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

type Phase = 'lobby' | 'loading' | 'reading' | 'playing' | 'answered' | 'finished';
type AnswerState = 'neutral' | 'correct' | 'wrong' | 'dimmed';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const WS_BASE = process.env.EXPO_PUBLIC_WS_URL ?? API_BASE.replace(/^https?/, (m: string) => m === 'https' ? 'wss' : 'ws');

// Timing constants (same as GameScreen)
const QUESTION_READ_MS = 3000;
const ANSWER_STAGGER_MS = 200;
const ANSWER_COUNT = 4;
const ANSWER_REVEAL_TOTAL_MS = ANSWER_STAGGER_MS * ANSWER_COUNT;
const POST_REVEAL_SETTLE_MS = 200;
const QUESTION_AREA_HEIGHT = 140;
const ANSWER_AREA_HEIGHT = 320;

function shuffleIndices(count: number): number[] {
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

function RoomPopInAnswerButton({
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
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (visible) {
      const mountTimer = setTimeout(() => setRevealed(true), revealDelay);
      scale.value = withDelay(revealDelay, withSpring(1, { mass: 1, damping: 7, stiffness: 40 }));
      opacity.value = withDelay(revealDelay, withTiming(1, { duration: 150 }));
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

  if (!visible && !revealed) {
    return <View style={{ minHeight: 60 }} />;
  }

  return (
    <Animated.View style={animStyle}>
      <AnswerButton text={answer} state={state} disabled={disabled} onPress={onPress} />
    </Animated.View>
  );
}
const WEB_BASE = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://quizza.vercel.app';

const LOBBY_TIPS = [
  'Tip: Faster answers earn more points! ⚡',
  'Tip: Build a streak to climb the leaderboard! 🔥',
  'Share the room code with friends! 📲',
  'Tip: Each correct answer is worth 50-100 points!',
  'Fun fact: Pizza was invented in Naples, Italy 🍕',
  'The more players, the more fun! 🎉',
  'Tip: Read the question carefully before answering!',
];

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
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [questionResults, setQuestionResults] = useState<(boolean | null)[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [mascotMood, setMascotMood] = useState<MascotMood>('thinking');
  const [mascotKey, setMascotKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedFriends, setAddedFriends] = useState<Set<string>>(new Set());
  const [existingFriends, setExistingFriends] = useState<Set<string>>(new Set());
  const [roomClosed, setRoomClosed] = useState('');

  // Lobby polish state
  const [tipIndex, setTipIndex] = useState(0);
  const [joinBurstKey, setJoinBurstKey] = useState(0);
  const prevPlayerCountRef = useRef(0);
  const readySoundPlayed = useRef(false);
  const playerCountScale = useSharedValue(1);
  const startBtnScale = useSharedValue(1);

  // Answer reveal state
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [revealOrder, setRevealOrder] = useState<number[]>([0, 1, 2, 3]);
  const [timerKey, setTimerKey] = useState(0);
  const [questionAnimKey, setQuestionAnimKey] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(Date.now());
  const readTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerMascot = (mood: MascotMood) => {
    setMascotMood(mood);
    setMascotKey(k => k + 1);
  };

  const startQuestionSequence = useCallback(() => {
    setButtonsVisible(false);
    setTimerActive(false);
    setPhase('reading');
    setRevealOrder(shuffleIndices(ANSWER_COUNT));

    readTimeoutRef.current = setTimeout(() => {
      setButtonsVisible(true);
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

  // Fetch friends when game finishes (for add-friend filtering)
  useEffect(() => {
    if (phase !== 'finished') return;
    api.get<{ id: string; username: string }[]>('/friends')
      .then(friends => setExistingFriends(new Set(friends.map(f => f.username))))
      .catch(() => {});
  }, [phase]);

  // Lobby music
  useEffect(() => {
    if (phase !== 'lobby') return;
    startLobbyMusic();
    return () => { stopLobbyMusic(); };
  }, [phase]);

  // Poll room state during lobby
  useEffect(() => {
    if (phase !== 'lobby' || !roomId) return;
    const fetchRoom = () =>
      api.get<{ room_code: string; status: string; players: RoomPlayer[]; category: string; timer_seconds?: number }>(
        `/rooms/${roomId}`
      ).then(data => {
        if (data.room_code) setRoomCode(data.room_code);
        if (data.category) setCategory(data.category);
        const newPlayers = data.players ?? [];
        const newCount = newPlayers.length;

        // Detect new player join
        if (newCount > prevPlayerCountRef.current && prevPlayerCountRef.current > 0) {
          playSound('tap');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setJoinBurstKey(k => k + 1);
          playerCountScale.value = withSequence(
            withSpring(1.15, { damping: 8, stiffness: 200 }),
            withSpring(1, { damping: 10, stiffness: 150 }),
          );
        }
        prevPlayerCountRef.current = newCount;

        // Start button pulse when enough players
        if (newCount >= 2 && !readySoundPlayed.current) {
          readySoundPlayed.current = true;
          startBtnScale.value = withRepeat(
            withSequence(
              withTiming(1.03, { duration: 800, easing: Easing.inOut(Easing.ease) }),
              withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            ),
            -1, true,
          );
        }

        setPlayers(newPlayers);
        if (data.status === 'active') setPhase('loading');
      }).catch((err: any) => {
        // Server returns specific error messages for expired/abandoned/started rooms
        if (err?.message) setRoomClosed(err.message);
      });

    fetchRoom();
    const interval = setInterval(fetchRoom, 2000);
    return () => clearInterval(interval);
  }, [phase, roomId]);

  // Tip rotation
  useEffect(() => {
    if (phase !== 'lobby') return;
    const interval = setInterval(() => setTipIndex(i => (i + 1) % LOBBY_TIPS.length), 5000);
    return () => clearInterval(interval);
  }, [phase]);


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
          setSelectedAnswer(null);
          setLastCorrect(null);
          setCorrectAnswer(null);
          setTimerKey(k => k + 1);
          setQuestionAnimKey(k => k + 1);
          setMascotMood('thinking');
          setMascotKey(k => k + 1);
          startQuestionSequence();
        }
        if (msg.type === 'sync_state') {
          setCurrentIndex(msg.currentQuestion);
          if (msg.answered) {
            setPhase('answered');
          } else {
            setSelectedAnswer(null);
            setLastCorrect(null);
            setCorrectAnswer(null);
            setTimerKey(k => k + 1);
            setQuestionAnimKey(k => k + 1);
            setMascotMood('thinking');
            setMascotKey(k => k + 1);
            startQuestionSequence();
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
      setQuestionResults(new Array(data.questions.length).fill(null));
      setTimerKey(k => k + 1);
      startQuestionSequence();
    }).catch(console.error);
  }, [phase, questionSetId, startQuestionSequence]);

  // Countdown timer (only when timerActive)
  useEffect(() => {
    if (!timerActive || phase !== 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimeLeft(QUESTION_TIME);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        if (t <= 6) playSound('tick');
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, phase, currentIndex]);

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
            setSelectedAnswer(null);
            setLastCorrect(null);
            setCorrectAnswer(null);
            setTimerKey(k => k + 1);
            setQuestionAnimKey(k => k + 1);
            setMascotMood('thinking');
            setMascotKey(k => k + 1);
            startQuestionSequence();
          }
        }).catch(console.error);
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [phase, currentIndex, roomId]);

  const submitAnswer = useCallback(async (answer: string, forcedTime?: number) => {
    if (phase !== 'playing' && phase !== 'reading') return;
    if (!roomId) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (readTimeoutRef.current) clearTimeout(readTimeoutRef.current);
    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);

    const timeTaken = forcedTime ?? Math.round((Date.now() - questionStartRef.current) / 1000);
    setSelectedAnswer(answer);
    setPhase('answered');
    setTimerActive(false);

    try {
      const result = await api.post<{ isCorrect: boolean; points: number; correctAnswer?: string; totalScore?: number }>(
        `/rooms/${roomId}/answer`,
        {
          questionIndex: currentIndex,
          selectedAnswer: answer === '__timeout__' ? '' : answer,
          timeTakenSeconds: Math.min(timeTaken, 30),
        }
      );
      setLastCorrect(result.isCorrect);
      setCorrectAnswer(result.correctAnswer ?? null);
      setQuestionResults(prev => {
        const next = [...prev];
        next[currentIndex] = result.isCorrect;
        return next;
      });
      if (result.points) setScore(s => s + result.points);
      triggerMascot(result.isCorrect ? 'celebrating' : 'wrong');
      playSound(result.isCorrect ? 'correct' : 'wrong');
    } catch (err) {
      console.error(err);
    }
  }, [phase, currentIndex, roomId]);

  const startGame = async () => {
    if (!roomId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareRoom = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const inviteUrl = `${WEB_BASE}/join/${roomCode}`;
    await Share.share({
      message: `Join my Quizza room! Code: ${roomCode}\n${inviteUrl}`,
      title: 'Join my Quizza room!',
    });
  };

  // ── Animated styles for lobby ──
  const playerCountAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playerCountScale.value }],
  }));
  const startBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: startBtnScale.value }],
  }));

  // ── ROOM CLOSED (expired / abandoned / already started) ──
  if (roomClosed) {
    return (
      <LinearGradient colors={gradients.bg} style={s.flex}>
        <View style={[s.center, { padding: 32 }]}>
          <PizzaMascot mood="wrong" size={110} />
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', textAlign: 'center', marginTop: 16 }}>
            {roomClosed}
          </Text>
          <TouchableOpacity
            style={[s.btn, s.btnGhost, { marginTop: 24 }]}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={s.btnGhostText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ── LOBBY ──
  if (phase === 'lobby') {
    const theme = getCategoryTheme(category);
    const [c1, c2] = parseGradientColors(theme.gradient);
    return (
      <LinearGradient colors={gradients.bg} style={s.flex}>
        {/* Subtle twinkle background */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <FloatingParticles />
        </View>

        {/* Scrollable top section */}
        <ScrollView
          style={s.flex}
          contentContainerStyle={[s.lobbyScrollContent, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity
            style={[s.closeBtn, { top: insets.top + 12 }]}
            onPress={async () => {
              if (isHost) {
                try { await api.post(`/rooms/${roomId}/abandon`, {}); } catch {}
              }
              navigation.navigate('MainTabs');
            }}
          >
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <Text style={s.lobbyTitle}>Room Lobby</Text>

          {/* Host badge */}
          {isHost && (
            <Animated.View entering={FadeIn.delay(200)} style={s.hostBadge}>
              <Text style={s.hostBadgeText}>You are the host 👑</Text>
            </Animated.View>
          )}

          {/* Category badge — compact */}
          {category ? (
            <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.categoryBadge}>
              <Text style={s.categoryEmoji}>{theme.emoji}</Text>
              <Text style={s.categoryName}>{category}</Text>
            </LinearGradient>
          ) : null}

          {/* Room code — single row */}
          <View style={s.codeRow}>
            <Text style={s.codeLabel}>Code</Text>
            <Text style={s.codeValue}>{roomCode}</Text>
            <TouchableOpacity style={[s.copyBtn, copied && { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: 'rgba(34,197,94,0.3)' }]} onPress={copyCode}>
              <Text style={[s.copyBtnText, copied && { color: '#22C55E' }]}>{copied ? '✓ Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>

          {/* Share invite */}
          <View style={s.shareRow}>
            <TouchableOpacity style={[s.shareBtn, s.flex1]} onPress={shareRoom} activeOpacity={0.7}>
              <Text style={s.shareBtnText}>📤 Share Invite</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.shareHint}>Friends can join via the link — no account needed.</Text>

          {/* Player list with join burst — max height, scrollable internally */}
          <View style={s.playerList}>
            <Animated.Text style={[s.playerListTitle, playerCountAnimStyle]}>
              Players ({players.length})
            </Animated.Text>
            {joinBurstKey > 0 && (
              <View style={{ position: 'absolute', right: 16, top: 16 }}>
                <JoinBurst key={joinBurstKey} />
              </View>
            )}
            <ScrollView style={s.playerScroll} nestedScrollEnabled>
              {players.map((p, i) => (
                <View key={p.playerId ?? i} style={s.playerRow}>
                  <Text style={s.playerRank}>{i + 1}</Text>
                  <Text style={s.playerName}>{p.username}{p.isHost ? ' 👑' : ''}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}

          {/* Start / Waiting — right below players */}
          {isHost ? (
            <Animated.View style={startBtnAnimStyle}>
              <TouchableOpacity
                style={[s.startBtn, (startLoading || players.length < 1) && s.startBtnDisabled]}
                onPress={startGame}
                disabled={startLoading || players.length < 1}
                activeOpacity={0.8}
              >
                {startLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.startBtnText}>Start Game</Text>}
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View style={s.waitingBox}>
              <Text style={s.waitingText}>Waiting for host to start...</Text>
            </View>
          )}
        </ScrollView>

        {/* Fixed bottom: mascot + tip */}
        <View style={[s.lobbyBottom, { paddingBottom: insets.bottom + 12 }]}>
          <LobbyMascot size={130} />
          <Animated.Text key={tipIndex} entering={FadeIn.duration(400)} style={s.tipText}>
            {LOBBY_TIPS[tipIndex]}
          </Animated.Text>
        </View>
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

          {/* Add friends from this room — only non-friends, non-self, non-guests */}
          {(() => {
            const suggestions = leaderboard.filter(e =>
              e.username !== user?.username &&
              !existingFriends.has(e.username) &&
              !addedFriends.has(e.username)
            );
            // Also count already-added ones to show them
            const added = leaderboard.filter(e =>
              e.username !== user?.username &&
              addedFriends.has(e.username)
            );
            if (suggestions.length === 0 && added.length === 0) return null;
            return (
              <View style={s.addFriendsBox}>
                <Text style={s.addFriendsTitle}>Add players as friends</Text>
                {[...suggestions, ...added].map(entry => (
                  <View key={entry.username} style={s.addFriendRow}>
                    <View style={s.addFriendAvatar}>
                      <Text style={s.addFriendAvatarText}>{entry.username[0].toUpperCase()}</Text>
                    </View>
                    <Text style={s.addFriendName}>{entry.username}</Text>
                    {addedFriends.has(entry.username) ? (
                      <Text style={s.addedText}>Added ✓</Text>
                    ) : (
                      <TouchableOpacity
                        style={s.addFriendBtn}
                        onPress={async () => {
                          try {
                            await api.post('/friends', { username: entry.username });
                            setAddedFriends(prev => new Set([...prev, entry.username]));
                          } catch {}
                        }}
                      >
                        <Text style={s.addFriendBtnText}>+ Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            );
          })()}

          <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={() => navigation.navigate('MainTabs')}>
            <Text style={s.btnGhostText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    );
  }

  // ── Helper: answer button state ──
  const getAnswerState = (answer: string): AnswerState => {
    if (!selectedAnswer || lastCorrect === null) return 'neutral';
    if (answer === correctAnswer) return 'correct';
    if (answer === selectedAnswer && !lastCorrect) return 'wrong';
    return 'dimmed';
  };

  // ── READING / PLAYING / ANSWERED ──
  const question = questions[currentIndex];
  if (!question) return null;

  const isReadingPhase = phase === 'reading';
  const canAnswer = phase === 'playing';

  return (
    <LinearGradient colors={gradients.game} style={s.flex}>
      {/* Top zone: status bar */}
      <View style={[s.topZone, { paddingTop: insets.top + 8 }]}>
        {/* Leaderboard strip */}
        {leaderboard.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scoreStripInner}>
            {leaderboard.slice(0, 4).map((entry, i) => (
              <View key={entry.username} style={s.scoreChip}>
                <Text style={s.scoreChipText}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {entry.username} {entry.score}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={s.topRow}>
          <TouchableOpacity style={s.quitBtn} onPress={() => navigation.navigate('MainTabs')}>
            <Text style={s.quitBtnText}>✕</Text>
          </TouchableOpacity>

          {/* Progress dots */}
          <View style={s.dotsRow}>
            {Array.from({ length: questions.length }, (_, i) => {
              let dotColor = 'rgba(255,255,255,0.15)';
              if (questionResults[i] === true) dotColor = colors.green;
              else if (questionResults[i] === false) dotColor = colors.red;
              else if (i === currentIndex) dotColor = colors.cyan;
              return (
                <View
                  key={i}
                  style={[
                    s.dot,
                    { backgroundColor: dotColor },
                    i === currentIndex && s.dotCurrent,
                  ]}
                />
              );
            })}
          </View>

          <View style={s.scoreContainer}>
            <Text style={s.scoreLabel}>Score</Text>
            <Text style={s.scoreValue}>{score}</Text>
          </View>
        </View>

        {/* Circular countdown timer */}
        <View style={s.timerRow}>
          <CircularTimer
            duration={QUESTION_TIME}
            timeLeft={timeLeft}
            isPlaying={timerActive}
            timerKey={timerKey}
          />
        </View>
      </View>

      {/* Middle zone: Question (fixed height) */}
      <View style={s.middleZone}>
        <View style={s.questionArea}>
          <Animated.View
            key={questionAnimKey}
            entering={SlideInRight.duration(250)}
            exiting={SlideOutLeft.duration(250)}
          >
            <Text style={s.questionCounter}>
              Question {currentIndex + 1} of {questions.length}
            </Text>
            <Text style={s.questionText}>{question.question}</Text>
          </Animated.View>
        </View>

        <View style={s.mascotCenter}>
          <PizzaMascot key={mascotKey} mood={mascotMood} size={60} />
        </View>
      </View>

      {/* Bottom zone: Answer buttons with pop-in reveal */}
      <View style={[s.bottomZone, { paddingBottom: insets.bottom + 20 }]}>
        <View style={s.answerArea}>
          {question.all_answers.map((answer, i) => {
            const staggerIndex = revealOrder[i] ?? i;
            return (
              <RoomPopInAnswerButton
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

          {isReadingPhase && !buttonsVisible && (
            <Animated.View entering={FadeIn.duration(300)} style={s.readingHint}>
              <Text style={s.readingHintText}>Read the question...</Text>
            </Animated.View>
          )}
        </View>

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
  lobbyScrollContent: { paddingHorizontal: 20, gap: 12, alignItems: 'stretch', paddingBottom: 8 },
  lobbyBottom: { paddingHorizontal: 20, alignItems: 'center', gap: 8 },
  closeBtn: { position: 'absolute', right: 20, zIndex: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: colors.textPrimary, fontSize: 16 },
  lobbyTitle: { color: colors.textPrimary, fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 36 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, padding: 10 },
  categoryEmoji: { fontSize: 22 },
  categoryName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  codeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 10 },
  codeLabel: { color: colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  codeValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '800', letterSpacing: 3, flex: 1 },
  copyBtn: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  copyBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  shareRow: { flexDirection: 'row', gap: 10 },
  shareBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  shareBtnText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  shareHint: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  playerList: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border, maxHeight: 160 },
  playerScroll: { gap: 8 },
  playerListTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playerRank: { color: colors.textMuted, fontSize: 14, width: 20 },
  playerName: { color: colors.textPrimary, fontSize: 15, fontWeight: '500' },
  error: { color: colors.red, fontSize: 14, textAlign: 'center' },
  startBtn: { backgroundColor: colors.cyan, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  waitingBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  waitingText: { color: colors.textMuted, fontSize: 15 },
  hostBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  hostBadgeText: { color: '#F59E0B', fontSize: 13, fontWeight: '600' },
  tipText: {
    color: colors.textMuted, fontSize: 13, textAlign: 'center',
    fontStyle: 'italic', marginTop: 8,
  },
  // === TOP ZONE (game) ===
  topZone: { paddingHorizontal: 16, paddingBottom: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  quitBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  quitBtnText: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },
  scoreStripInner: { paddingHorizontal: 0, gap: 8, marginBottom: 8 },
  scoreChip: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  scoreChipText: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, justifyContent: 'center', paddingHorizontal: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotCurrent: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: colors.textPrimary },
  scoreContainer: { alignItems: 'center', minWidth: 50 },
  scoreLabel: { fontSize: 10, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreValue: { fontVariant: ['tabular-nums'], fontSize: 18, fontWeight: '800', color: colors.amber ?? '#F59E0B' },
  timerRow: { alignItems: 'center', paddingVertical: 4 },
  // === MIDDLE ZONE ===
  middleZone: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  questionArea: { minHeight: QUESTION_AREA_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  questionCounter: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  questionText: { fontSize: 21, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', lineHeight: 32 },
  mascotCenter: { alignItems: 'center', marginTop: 12 },
  // === BOTTOM ZONE ===
  bottomZone: { paddingHorizontal: 16 },
  answerArea: { minHeight: ANSWER_AREA_HEIGHT, justifyContent: 'flex-end', gap: 12 },
  readingHint: { alignItems: 'center', paddingVertical: 8 },
  readingHintText: { color: colors.textMuted, fontSize: 14, fontWeight: '600', fontStyle: 'italic' },
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
  addFriendsBox: {
    alignSelf: 'stretch', backgroundColor: 'rgba(30,41,59,0.5)',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border, gap: 10,
  },
  addFriendsTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  addFriendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addFriendAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(124,58,237,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  addFriendAvatarText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  addFriendName: { flex: 1, color: colors.textPrimary, fontSize: 14 },
  addedText: { color: colors.green, fontSize: 13, fontWeight: '600' },
  addFriendBtn: {
    backgroundColor: 'rgba(124,58,237,0.2)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  addFriendBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  btn: { borderRadius: 12, padding: 14, alignItems: 'center', minWidth: 200 },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  btnGhostText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
});
