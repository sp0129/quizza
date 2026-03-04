import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import PizzaMascot from '../components/PizzaMascot';
import Sparkles from '../components/Sparkles';
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

interface IncomingChallenge {
  id: string;
  category: string;
  game_id: string;
  expires_at: string;
  inviter_username: string;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [pending, setPending] = useState<PendingGame[]>([]);
  const [incoming, setIncoming] = useState<IncomingChallenge[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [challengeUsername, setChallengeUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const [soloLoading, setSoloLoading] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [roomLoading, setRoomLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCategories).catch(console.error);
    api.get<PendingGame[]>('/games/pending').then(setPending).catch(console.error);
    api.get<IncomingChallenge[]>('/challenges/incoming').then(setIncoming).catch(console.error);
    const t = setTimeout(() => playGibberish('excited'), 700);
    return () => clearTimeout(t);
  }, []);

  // Keep emoji for speech bubble only — background no longer changes
  const emoji = selectedCategory
    ? getCategoryTheme(selectedCategory.name, selectedCategory.id).emoji
    : '🧠';

  const playSolo = async () => {
    if (!selectedCategory) { setError('Pick a category first!'); return; }
    setSoloLoading(true);
    setError('');
    try {
      const result = await api.post<{ gameId: string; questionSetId: string }>(
        '/games/solo',
        { category: selectedCategory.name, categoryId: selectedCategory.id }
      );
      navigate(`/game/${result.gameId}?mode=async&qsid=${result.questionSetId}&cat=${encodeURIComponent(selectedCategory.name)}&catId=${selectedCategory.id}`);
    } catch (err: any) {
      setError(err.message);
      setSoloLoading(false);
    }
  };

  const sendChallenge = async () => {
    if (!selectedCategory) { setError('Pick a category first!'); return; }
    if (!challengeUsername.trim()) { setError('Enter a username to challenge'); return; }
    setChallengeLoading(true);
    setError('');
    try {
      const result = await api.post<{ gameId: string; questionSetId: string }>(
        '/challenges',
        { targetUsername: challengeUsername.trim(), category: selectedCategory.name, categoryId: selectedCategory.id }
      );
      navigate(`/game/${result.gameId}?mode=async&qsid=${result.questionSetId}&cat=${encodeURIComponent(selectedCategory.name)}&catId=${selectedCategory.id}`);
    } catch (err: any) {
      setError(err.message);
      setChallengeLoading(false);
    }
  };

  const acceptChallenge = async (inv: IncomingChallenge) => {
    try {
      const result = await api.post<{ gameId: string; questionSetId: string; category: string }>(
        `/challenges/${inv.id}/accept`,
        {}
      );
      navigate(`/game/${result.gameId}?mode=async&qsid=${result.questionSetId}&cat=${encodeURIComponent(result.category)}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const createRoom = async () => {
    if (!selectedCategory) { setError('Pick a category first!'); return; }
    setRoomLoading(true);
    setError('');
    try {
      const result = await api.post<{ roomId: string; roomCode: string; questionSetId: string; category: string }>(
        '/rooms',
        { category: selectedCategory.name, categoryId: selectedCategory.id }
      );
      navigate(`/room/${result.roomId}?host=true&qsid=${result.questionSetId}&cat=${encodeURIComponent(result.category)}&catId=${selectedCategory.id}`);
    } catch (err: any) {
      setError(err.message);
      setRoomLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!roomCode.trim()) { setError('Enter a room code'); return; }
    setJoinLoading(true);
    setError('');
    try {
      const result = await api.post<{ roomId: string; roomCode: string; questionSetId: string; category: string }>(
        '/rooms/join',
        { roomCode: roomCode.trim() }
      );
      navigate(`/room/${result.roomId}?qsid=${result.questionSetId}&cat=${encodeURIComponent(result.category)}`);
    } catch (err: any) {
      setError(err.message);
      setJoinLoading(false);
    }
  };

  const joinPendingGame = async (gameId: string, categoryName: string) => {
    try {
      const result = await api.post<{ id: string; question_set_id: string }>(
        `/games/${gameId}/join`,
        {}
      );
      navigate(`/game/${result.id}?mode=async&qsid=${result.question_set_id}&cat=${encodeURIComponent(categoryName)}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="gradient-page-wrapper">
      <Sparkles />

      <div className="gradient-page">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-logo">
            <PizzaMascot mood="idle" size={38} className="mascot-float" />
            <h1 className="page-title">Quizza</h1>
          </div>
          <div className="user-info">
            <span>{user?.username}</span>
            <button onClick={logout} className="btn btn-ghost btn-sm">Log out</button>
          </div>
        </header>

        {/* Mascot + category selector */}
        <div className="mascot-prompt">
          <div className="speech-bubble">
            {selectedCategory ? `${emoji} ${selectedCategory.name}!` : 'Pick a category! 🍕'}
          </div>
          <PizzaMascot mood={selectedCategory ? 'excited' : 'thinking'} size={70} className="mascot-float" />
        </div>

        <select
          className="field"
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

        {error && <p className="inline-error">{error}</p>}

        <div className="stack stack-4">
          {/* Solo card */}
          <div className="card card-green">
            <h2 className="card-title">⚡ Solo Play</h2>
            <p className="card-body">Jump in instantly — 10 questions, all you.</p>
            <button
              className="btn btn-play btn-block"
              onClick={playSolo}
              disabled={soloLoading || !selectedCategory}
            >
              {soloLoading ? 'Starting...' : '⚡ PLAY SOLO'}
            </button>
          </div>

          {/* Challenge + Room cards side by side */}
          <div className="two-col">
            <div className="card card-amber stack stack-3">
              <h2 className="card-title">⚔️ Challenge</h2>
              <p className="card-body">Dare a friend by username.</p>
              <input
                className="field"
                type="text"
                placeholder="Friend's username"
                value={challengeUsername}
                onChange={e => setChallengeUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChallenge()}
              />
              <button
                className="btn btn-challenge btn-block"
                onClick={sendChallenge}
                disabled={challengeLoading || !selectedCategory || !challengeUsername.trim()}
              >
                {challengeLoading ? 'Sending...' : '⚔️ Challenge'}
              </button>
            </div>

            <div className="card card-cyan stack stack-3">
              <h2 className="card-title">🏠 Room</h2>
              <p className="card-body">Live multiplayer. Share the code!</p>
              <button
                className="btn btn-room btn-block"
                onClick={createRoom}
                disabled={roomLoading || !selectedCategory}
              >
                {roomLoading ? 'Creating...' : '+ Create'}
              </button>
              <div className="room-join-row">
                <input
                  className="field room-code-input"
                  type="text"
                  placeholder="Room code"
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  onKeyDown={e => e.key === 'Enter' && joinRoom()}
                />
                <button
                  className="btn btn-ghost"
                  onClick={joinRoom}
                  disabled={joinLoading || !roomCode.trim()}
                >
                  {joinLoading ? '...' : 'Join'}
                </button>
              </div>
            </div>
          </div>

          {/* Incoming challenges */}
          {incoming.length > 0 && (
            <section className="card card-amber">
              <h2 className="section-title">⚔️ Incoming Challenges</h2>
              {incoming.map(inv => (
                <div key={inv.id} className="inbox-card">
                  <div className="inbox-info">
                    <strong>{inv.inviter_username}</strong> challenged you in <em>{inv.category}</em>
                    <span className="inbox-expires">Expires {new Date(inv.expires_at).toLocaleString()}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => acceptChallenge(inv)}>Accept</button>
                </div>
              ))}
            </section>
          )}

          {/* Open games */}
          {pending.length > 0 && (
            <section className="card card-cyan">
              <h2 className="section-title">⏳ Open Games</h2>
              {pending.map(g => (
                <div key={g.id} className="inbox-card">
                  <div className="inbox-info">
                    <strong>{g.challenger_username}</strong> started a game in <em>{g.category}</em>
                    <span className="inbox-expires">Expires {new Date(g.expires_at).toLocaleString()}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => joinPendingGame(g.id, g.category)}>Play</button>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
