import { useParams } from 'react-router-dom';
import PizzaMascot from '../components/PizzaMascot';
import Sparkles from '../components/Sparkles';

export default function GuestJoinPage() {
  const { roomCode } = useParams<{ roomCode: string }>();

  return (
    <div className="gradient-page-wrapper">
      <Sparkles />
      <div className="gradient-page">
        <div className="auth-card" style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <PizzaMascot mood="excited" size={110} />
          </div>

          <h1 className="page-title" style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>
            You've been invited!
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '1.5rem' }}>
            Open this link on your iPhone to join the game in the Quizza app.
          </p>

          <div className="room-code-display" style={{ marginBottom: '1.5rem' }}>
            <span className="room-code-label">Room Code</span>
            <span className="room-code-value">{roomCode?.toUpperCase()}</span>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Don't have the app yet? Get it on TestFlight:
          </p>

          <a
            href="https://testflight.apple.com/join/ZGn86wHH"
            className="btn btn-block"
            style={{
              display: 'block', textDecoration: 'none', textAlign: 'center',
              background: '#1d4ed8', color: '#ffffff', fontWeight: 700,
              padding: '1rem', borderRadius: '0.75rem', fontSize: '1.1rem',
            }}
          >
            Download on TestFlight
          </a>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1.5rem' }}>
            After installing, open this link again on your phone — it will open directly in the app.
          </p>
        </div>
      </div>
    </div>
  );
}
