'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';

const ERRORS = {
  'auth/invalid-email': 'That email address is not valid.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and retry.',
};

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!configured) {
      setError('Firebase is not configured yet. See the README setup steps.');
      return;
    }
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/dashboard');
    } catch (err) {
      setError(ERRORS[err.code] || 'Could not sign in. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-side">
        <span className="brand" style={{ fontSize: '1.7rem' }}>
          <span className="art">ART</span>
          <span className="icles">icles</span>
          <span className="dot">.</span>
        </span>
        <p className="auth-side-quote">
          &ldquo;The best ideas deserve a <span className="hl">beautiful</span> place
          to be read.&rdquo;
        </p>
        <p className="faint">A publishing platform for writers and readers.</p>
      </div>

      <div className="auth-main">
        <div className="auth-card">
          <h1>Welcome back</h1>
          <p className="muted">Log in to continue to your dashboard.</p>

          {!configured && (
            <div className="notice notice-warn mt-2">
              Firebase isn&apos;t configured. Add your keys to <code>.env.local</code> (see README).
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="notice notice-error">{error}</div>}

            <div className="field">
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="field">
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
              />
            </div>

            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Signing in...' : 'Log in'}
            </button>
          </form>

          <p className="auth-switch">
            New to ARTicles? <Link href="/signup">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
