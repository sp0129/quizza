import { useCallback, useEffect, useRef } from 'react';
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

  const fetchChallenges = useCallback(async () => {
    setChallengesLoading(true);
    try {
      const raw = await api.get<RawChallenge[]>('/challenges/incoming');
      setChallenges(raw.map(mapRawChallenge));
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
