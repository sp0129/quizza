import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { api } from '../api/client';
import { useDashboardStore, Challenge } from '../stores/dashboard';

interface RawChallenge {
  id: string;
  category: string;
  game_id: string;
  expires_at: string;
  created_at?: string;
  inviter_id?: string;
  inviter_username: string;
  status?: string;
}

interface RawCompletedChallenge {
  id: string;
  gameId: string;
  category: string;
  myScore: number;
  opponentScore: number;
  opponentUsername: string;
  won: boolean;
  tied: boolean;
  completedAt: string;
  seen?: boolean;
}

interface RawOutgoingChallenge {
  id: string;
  gameId: string;
  category: string;
  opponentUsername: string;
  status: 'waiting' | 'completed';
  createdAt: string;
  expiresAt: string;
  myScore?: number;
  opponentScore?: number;
  won?: boolean;
  tied?: boolean;
  completedAt?: string;
  seen?: boolean;
}

function mapRawChallenge(raw: RawChallenge): Challenge {
  return {
    id: raw.id,
    opponentId: raw.inviter_id ?? '',
    opponentUsername: raw.inviter_username,
    opponentHandle: `@${raw.inviter_username.toLowerCase()}`,
    category: raw.category,
    gameId: raw.game_id,
    status: raw.status === 'waiting' ? 'waiting' : raw.status === 'your_turn' ? 'your_turn' : 'incoming',
    createdAt: raw.created_at ?? raw.expires_at,
    expiresAt: raw.expires_at,
  };
}

function mapCompletedChallenge(raw: RawCompletedChallenge): Challenge {
  return {
    id: raw.id,
    opponentId: '',
    opponentUsername: raw.opponentUsername,
    opponentHandle: `@${raw.opponentUsername.toLowerCase()}`,
    category: raw.category,
    gameId: raw.gameId,
    status: 'completed',
    createdAt: raw.completedAt,
    expiresAt: raw.completedAt,
    myScore: raw.myScore,
    opponentScore: raw.opponentScore,
    won: raw.won,
    tied: raw.tied,
    seen: raw.seen,
  };
}

function mapOutgoingChallenge(raw: RawOutgoingChallenge): Challenge {
  return {
    id: raw.id,
    opponentId: '',
    opponentUsername: raw.opponentUsername,
    opponentHandle: `@${raw.opponentUsername.toLowerCase()}`,
    category: raw.category,
    gameId: raw.gameId,
    status: raw.status === 'completed' ? 'completed' : 'waiting',
    createdAt: raw.createdAt,
    expiresAt: raw.expiresAt,
    myScore: raw.myScore,
    opponentScore: raw.opponentScore,
    won: raw.won,
    tied: raw.tied,
    seen: raw.seen,
  };
}

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export function useChallenges() {
  const {
    challenges,
    challengesLoading,
    setChallenges,
    addChallenge,
    removeChallenge,
    setChallengesLoading,
  } = useDashboardStore();

  const hasFetched = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchChallenges = useCallback(async () => {
    setChallengesLoading(true);
    try {
      const [incoming, completed, outgoing] = await Promise.all([
        api.get<RawChallenge[]>('/challenges/incoming'),
        api.get<RawCompletedChallenge[]>('/challenges/completed').catch(() => [] as RawCompletedChallenge[]),
        api.get<RawOutgoingChallenge[]>('/challenges/outgoing').catch(() => [] as RawOutgoingChallenge[]),
      ]);

      // Deduplicate: outgoing completed challenges may overlap with /completed endpoint
      const completedIds = new Set(completed.map(c => c.id));
      const uniqueOutgoing = outgoing.filter(o => !completedIds.has(o.id));

      setChallenges([
        ...incoming.map(mapRawChallenge),
        ...completed.map(mapCompletedChallenge),
        ...uniqueOutgoing.map(mapOutgoingChallenge),
      ]);
    } catch {
      // silently fail — keep existing challenges
    } finally {
      setChallengesLoading(false);
    }
  }, [setChallenges, setChallengesLoading]);

  const acceptChallenge = useCallback(
    async (challenge: Challenge) => {
      const result = await api.post<{
        gameId: string;
        questionSetId: string;
        category: string;
      }>(`/challenges/${challenge.id}/accept`, {});
      removeChallenge(challenge.id);
      return result;
    },
    [removeChallenge],
  );

  const declineChallenge = useCallback(
    async (challenge: Challenge) => {
      try {
        await api.post(`/challenges/${challenge.id}/decline`, {});
      } catch {
        // best effort
      }
      removeChallenge(challenge.id);
    },
    [removeChallenge],
  );

  // Fetch once on mount
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchChallenges();
    }
  }, [fetchChallenges]);

  // Poll for updates when there are waiting challenges
  const hasWaiting = challenges.some(c => c.status === 'waiting');

  useEffect(() => {
    if (!hasWaiting) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(() => {
      fetchChallenges();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [hasWaiting, fetchChallenges]);

  // Re-fetch when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        fetchChallenges();
      }
    });
    return () => sub.remove();
  }, [fetchChallenges]);

  return {
    challenges,
    challengesLoading,
    fetchChallenges,
    acceptChallenge,
    declineChallenge,
    addChallenge,
    pendingCount: challenges.filter(
      (c) => c.status === 'incoming' || c.status === 'your_turn',
    ).length,
  };
}
