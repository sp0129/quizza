import { create } from 'zustand';

// ─── Types ──────────────────────────────────────────
export interface Challenge {
  id: string;
  opponentId: string;
  opponentUsername: string;
  opponentHandle: string;
  opponentAvatar?: string;
  category: string;
  gameId: string;
  status: 'your_turn' | 'waiting' | 'incoming' | 'completed';
  createdAt: string;
  expiresAt: string;
  myScore?: number;
  opponentScore?: number;
  won?: boolean;
  tied?: boolean;
  seen?: boolean;
}

export interface UserMetrics {
  streak: number;
  wins: number;
  winRate: number;
  rank?: number;
  level: number;
  gems: number;
  xp: number;
  xpToNextLevel: number;
}

export interface SearchedUser {
  id: string;
  username: string;
  handle: string;
  profilePictureUrl?: string;
  isOnline?: boolean;
  isFriend?: boolean;
  mutualFriends?: string[];
  lastActive?: string;
}

interface DashboardState {
  // Challenges
  challenges: Challenge[];
  challengesLoading: boolean;
  seenResultIds: Set<string>;
  setChallenges: (challenges: Challenge[]) => void;
  addChallenge: (challenge: Challenge) => void;
  removeChallenge: (id: string) => void;
  markChallengeSeen: (id: string) => void;
  setChallengesLoading: (loading: boolean) => void;

  // Metrics
  metrics: UserMetrics;
  setMetrics: (metrics: Partial<UserMetrics>) => void;

  // Search
  searchResults: SearchedUser[];
  recentSearches: SearchedUser[];
  searchLoading: boolean;
  setSearchResults: (results: SearchedUser[]) => void;
  setRecentSearches: (recent: SearchedUser[]) => void;
  addRecentSearch: (user: SearchedUser) => void;
  setSearchLoading: (loading: boolean) => void;

  // UI state
  challengeModalVisible: boolean;
  searchOverlayVisible: boolean;
  setChallengeModalVisible: (visible: boolean) => void;
  setSearchOverlayVisible: (visible: boolean) => void;
}

const DEFAULT_METRICS: UserMetrics = {
  streak: 0,
  wins: 0,
  winRate: 0,
  rank: undefined,
  level: 1,
  gems: 0,
  xp: 0,
  xpToNextLevel: 100,
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Challenges
  challenges: [],
  challengesLoading: true,
  seenResultIds: new Set<string>(),
  setChallenges: (challenges) => set({ challenges }),
  addChallenge: (challenge) =>
    set((s) => ({ challenges: [challenge, ...s.challenges] })),
  removeChallenge: (id) =>
    set((s) => ({ challenges: s.challenges.filter((c) => c.id !== id) })),
  markChallengeSeen: (id) =>
    set((s) => {
      const next = new Set(s.seenResultIds);
      next.add(id);
      return { seenResultIds: next };
    }),
  setChallengesLoading: (loading) => set({ challengesLoading: loading }),

  // Metrics
  metrics: DEFAULT_METRICS,
  setMetrics: (partial) =>
    set((s) => ({ metrics: { ...s.metrics, ...partial } })),

  // Search
  searchResults: [],
  recentSearches: [],
  searchLoading: false,
  setSearchResults: (results) => set({ searchResults: results }),
  setRecentSearches: (recent) => set({ recentSearches: recent }),
  addRecentSearch: (user) =>
    set((s) => ({
      recentSearches: [
        user,
        ...s.recentSearches.filter((u) => u.id !== user.id),
      ].slice(0, 8),
    })),
  setSearchLoading: (loading) => set({ searchLoading: loading }),

  // UI state
  challengeModalVisible: false,
  searchOverlayVisible: false,
  setChallengeModalVisible: (visible) =>
    set({ challengeModalVisible: visible }),
  setSearchOverlayVisible: (visible) =>
    set({ searchOverlayVisible: visible }),
}));
