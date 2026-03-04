import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import PizzaMascot from '../components/PizzaMascot';
import Sparkles from '../components/Sparkles';
import { playGibberish } from '../utils/sounds';

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

  const [incoming, setIncoming] = useState<IncomingChallenge[]>([]);
  const [challengeUsername, setChallengeUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<IncomingChallenge[]>('/challenges/incoming').then(setIncoming).catch(console.error);
    const t = setTimeout(() => playGibberish('excited'), 700);
    return () => clearTimeout(t);
  }, []);

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

  const goChallenge = () => {
    if (!challengeUsername.trim()) { setError('Enter a username to challenge'); return; }
    navigate(`/category?mode=challenge&target=${encodeURIComponent(challengeUsername.trim())}`);
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

        {error && <p className="inline-error">{error}</p>}

        <div className="mode-cards">
          {/* Solo card */}
          <div className="card card-green stack stack-3">
            <h2 className="card-title">⚡ Play Solo</h2>
            <p className="card-body">Jump in instantly — 10 questions, all you.</p>
            <button
              className="btn btn-play btn-block"
              onClick={() => navigate('/category?mode=solo')}
            >
              ⚡ PLAY SOLO
            </button>
          </div>

          {/* Room card */}
          <div className="card card-cyan stack stack-3">
            <h2 className="card-title">🏠 Room</h2>
            <p className="card-body">Live multiplayer. Create a room and share the code!</p>
            <button
              className="btn btn-room btn-block"
              onClick={() => navigate('/category?mode=room')}
            >
              + Create Room
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

          {/* Challenge card */}
          <div className="card card-amber stack stack-3">
            <h2 className="card-title">⚔️ Challenge</h2>
            <p className="card-body">Dare a friend by username.</p>
            <div className="challenge-input-row">
              <input
                className="field"
                type="text"
                placeholder="Friend's username"
                value={challengeUsername}
                onChange={e => setChallengeUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && goChallenge()}
              />
              <button className="btn btn-challenge" onClick={goChallenge}>
                Challenge →
              </button>
            </div>
          </div>

          {/* Incoming challenges */}
          {incoming.length > 0 && (
            <section className="card">
              <h2 className="section-title">⚔️ Incoming</h2>
              <div className="challenges-scroll">
                {[...incoming]
                  .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())
                  .map(inv => (
                    <div
                      key={inv.id}
                      className="challenge-chip"
                      onClick={() => acceptChallenge(inv)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && acceptChallenge(inv)}
                    >
                      <div className="challenge-avatar">
                        {inv.inviter_username[0].toUpperCase()}
                      </div>
                      <span className="challenge-chip-name">{inv.inviter_username}</span>
                      <span className="challenge-chip-cat">{inv.category}</span>
                    </div>
                  ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
