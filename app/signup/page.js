'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';

const ERRORS = {
  'auth/email-already-in-use': 'An account already exists with that email.',
  'auth/invalid-email': 'That email address is not valid.',
  'auth/weak-password': 'Password should be at least 6 characters.',
};

export default function SignupPage() {
  const router = useRouter();
  const { user, loading, configured } = useAuth();
  const [name, setName] = useState('');
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
    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const displayName = name.trim() || email.split('@')[0];
      await updateProfile(cred.user, { displayName });

      const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase().trim();
      const role =
        adminEmail && cred.user.email.toLowerCase() === adminEmail ? 'admin' : 'user';

      await setDoc(doc(db, 'users', cred.user.uid), {
        email: cred.user.email,
        displayName,
        role,
        emailNotifications: true,
        createdAt: serverTimestamp(),
      });

      router.replace('/dashboard');
    } catch (err) {
      setError(ERRORS[err.code] || 'Could not create your account. Please try again.');
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
          Join a community that turns reading into a <span className="hl">craft</span>.
        </p>
        <p className="faint">Free forever. Start writing in seconds.</p>
      </div>

      <div className="auth-main">
        <div className="auth-card">
          <h1>Create your account</h1>
          <p className="muted">It only takes a moment.</p>

          {!configured && (
            <div className="notice notice-warn mt-2">
              Firebase isn&apos;t configured. Add your keys to <code>.env.local</code> (see README).
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="notice notice-error">{error}</div>}

            <div className="field">
              <label className="label">Display name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Writer"
                required
              />
            </div>

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
                placeholder="At least 6 characters"
                required
              />
            </div>

            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
