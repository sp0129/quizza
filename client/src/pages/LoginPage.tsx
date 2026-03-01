import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PizzaMascot from '../components/PizzaMascot';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'entrance' | 'excited'>('entrance');

  useEffect(() => {
    const t = setTimeout(() => setPhase('excited'), 900);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="mascot-area">
        <PizzaMascot
          mood="excited"
          size={180}
          className={`mascot-${phase}`}
        />
        <div className="speech-bubble">Let's get quizzin'! 🍕</div>
      </div>

      <div className="auth-container" style={{ margin: 0 }}>
        <h1>Quizza</h1>
        <h2>Log in</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <p>No account? <Link to="/signup">Sign up</Link></p>
      </div>
    </div>
  );
}
