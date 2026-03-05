import { useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import PizzaMascot from '../components/PizzaMascot';
import Sparkles from '../components/Sparkles';

export default function GuestJoinPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Enter a name to continue'); return; }

    setLoading(true);
    setError('');
    try {
      // Create a guest account and set auth context
      await loginAsGuest(trimmed);

      // Join the room with the code from the link
      const data = await api.post<{ roomId: string; questionSetId: string; category: string }>(
        '/rooms/join',
        { roomCode: roomCode?.toUpperCase() }
      );

      navigate(`/room/${data.roomId}?qsid=${data.questionSetId}`);
    } catch (err: any) {
      setError(err.message ?? 'Could not join room');
      setLoading(false);
    }
  };

  return (
    <div className="gradient-page-wrapper">
      <Sparkles />
      <div className="gradient-page">
        <div className="auth-card" style={{ maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <PizzaMascot mood="thinking" size={90} />
          </div>

          <h1 className="page-title text-center" style={{ fontSize: '1.6rem' }}>Join Room</h1>

          <div className="room-code-display" style={{ marginBottom: '1.5rem' }}>
            <span className="room-code-label">Room Code</span>
            <span className="room-code-value">{roomCode?.toUpperCase()}</span>
          </div>

          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Your name</label>
              <input
                className="form-input"
                type="text"
                placeholder="Pick a nickname…"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={30}
                autoFocus
              />
            </div>

            {error && <p className="inline-error">{error}</p>}

            <button className="btn btn-room btn-block" type="submit" disabled={loading}>
              {loading ? 'Joining…' : '▶ Join Game'}
            </button>
          </form>

          <p className="text-muted text-center" style={{ marginTop: '1.2rem', fontSize: '0.85rem' }}>
            No account needed — you'll play as a guest.
          </p>
        </div>
      </div>
    </div>
  );
}
