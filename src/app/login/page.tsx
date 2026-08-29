'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        window.location.href = '/';
        return;
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel" style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <h2>Login</h2>
      {error && <p style={{ color: '#ff4444', marginBottom: '1rem' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </section>
  );
}
