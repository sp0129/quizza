import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PizzaMascot from '../components/PizzaMascot';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(username, email, password);
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
        <PizzaMascot mood="happy" size={110} className="mascot-float" />
      </div>

      <div className="auth-card">
        <h1>Quizza</h1>
        <h2>Create account</h2>
        <form onSubmit={handleSubmit}>
          <input
            className="field"
            type="text" placeholder="Username" value={username}
            onChange={e => setUsername(e.target.value)} required
          />
          <input
            className="field"
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
          />
          <input
            className="field"
            type="password" placeholder="Password (min 8 chars)" value={password}
            onChange={e => setPassword(e.target.value)} minLength={8} required
          />
          {error && <p className="inline-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
        <p>Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
}
