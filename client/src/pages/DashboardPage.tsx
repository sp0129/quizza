import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import PizzaMascot from '../components/PizzaMascot';
import FloatingIcons from '../components/FloatingIcons';
import { getCategoryTheme } from '../utils/categoryThemes';
import { playGibberish } from '../utils/sounds';

interface Category {
  id: number;
  name: string;
}

interface PendingGame {
  id: string;
  category: string;
  challenger_username: string;
  expires_at: string;
}

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #9ca1b2 0%, #abaab2 100%)';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [pending, setPending] = useState<PendingGame[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [matchmaking, setMatchmaking] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCategories).catch(console.error);
    api.get<PendingGame[]>('/games/pending').then(setPending).catch(console.error);
    // Play welcome gibberish after a short delay so the audio context is warm
    const t = setTimeout(() => playGibberish('excited'), 700);
    return () => clearTimeout(t);
  }, []);

  const theme = selectedCategory
    ? getCategoryTheme(selectedCategory.name, selectedCategory.id)
    : { gradient: DEFAULT_GRADIENT, accent: '#4547a8', emoji: '🧠' };

  const stopCountdown = () => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  };

  const startRandomMatch = async () => {
    if (!selectedCategory) return;
    setMatchmaking(true);
    setCountdown(15);
    setError('');

    // Tick down every second
    countdownRef.current = setInterval(() => {
      setCountdown(c => (c <= 1 ? (stopCountdown(), 0) : c - 1));
    }, 1000);

    try {
      const result = await api.post<{ gameId: string; mode: string; questionSetId: string }>(
        '/games/create-random',
        { category: selectedCategory.name, categoryId: selectedCategory.id }
      );
      stopCountdown();
      navigate(
        `/game/${result.gameId}?mode=${result.mode}&qsid=${result.questionSetId}&cat=${encodeURIComponent(selectedCategory.name)}&catId=${selectedCategory.id}`
      );
    } catch (err: any) {
      stopCountdown();
      setError(err.message);
      setMatchmaking(false);
    }
  };

  const joinGame = async (gameId: string, categoryName: string) => {
    try {
      const result = await api.post<{ id: string; question_set_id: string }>(
        `/games/${gameId}/join`,
        {}
      );
      navigate(
        `/game/${result.id}?mode=async&qsid=${result.question_set_id}&cat=${encodeURIComponent(categoryName)}`
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="gradient-page-wrapper" style={{ background: theme.gradient }}>
      <FloatingIcons emoji={theme.emoji} />

      <div className="gradient-page">
        <header className="dashboard" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <PizzaMascot mood="idle" size={48} className="mascot-float" />
              <h1 style={{ fontSize: '1.75rem' }}>Quizza</h1>
            </div>
            <div className="user-info">
              <span>{user?.username}</span>
              <button onClick={logout}>Log out</button>
            </div>
          </div>
        </header>

        <section className="play-section">
          <div className="mascot-prompt">
            <div className="speech-bubble">Pick a category! 🍕</div>
            <PizzaMascot mood="thinking" size={90} className="mascot-float" />
          </div>
          <select
            value={selectedCategory?.id ?? ''}
            onChange={e => {
              const cat = categories.find(c => c.id === parseInt(e.target.value));
              setSelectedCategory(cat ?? null);
            }}
          >
            <option value="">Select category...</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {selectedCategory && (
            <div
              className="category-preview"
              style={{ background: theme.accent + '22', color: theme.accent }}
            >
              <span style={{ fontSize: '1.4rem' }}>{theme.emoji}</span>
              <span>{selectedCategory.name}</span>
            </div>
          )}

          <button onClick={startRandomMatch} disabled={!selectedCategory || matchmaking} style={{ marginTop: '0.75rem' }}>
            {matchmaking ? `Finding opponent... ${countdown}s` : 'Play'}
          </button>
          {error && <p className="error">{error}</p>}
        </section>

        {pending.length > 0 && (
          <section className="pending-section">
            <h2>Pending challenges</h2>
            {pending.map(g => (
              <div key={g.id} className="challenge-card">
                <strong>{g.challenger_username}</strong> challenged you in <em>{g.category}</em>
                <span className="expires">
                  Expires {new Date(g.expires_at).toLocaleString()}
                </span>
                <button onClick={() => joinGame(g.id, g.category)}>Accept</button>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
