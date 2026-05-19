'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { getInitials, formatDate } from '@/lib/helpers';

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.displayName || '');
      setNotify(profile.emailNotifications !== false);
    }
  }, [profile]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  async function save() {
    if (!name.trim()) {
      setToast('Display name cannot be empty.');
      return;
    }
    setBusy(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: name.trim(),
        emailNotifications: notify,
      });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name.trim() });
      }
      await refreshProfile();
      setToast('Settings saved.');
    } catch (err) {
      console.error('Save failed:', err);
      setToast('Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <div className="page-head">
        <h1>Settings</h1>
        <p>Manage your profile and notification preferences.</p>
      </div>

      <div className="panel stack">
        <div className="row">
          <div className="avatar avatar-lg">{getInitials(profile?.displayName || 'R')}</div>
          <div>
            <strong style={{ fontSize: '1.1rem' }}>{profile?.displayName}</strong>
            <p className="muted" style={{ fontSize: '0.86rem' }}>{user?.email}</p>
            <span className="badge badge-gold mt-1">{profile?.role || 'user'}</span>
          </div>
        </div>
      </div>

      <div className="panel stack mt-2">
        <div className="field">
          <label className="label">Display name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="field">
          <label className="label">Email address</label>
          <input className="input" value={user?.email || ''} disabled />
        </div>

        <div
          className="spread"
          style={{
            padding: '14px 16px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-2)',
          }}
        >
          <div>
            <strong>Email notifications</strong>
            <p className="muted" style={{ fontSize: '0.84rem' }}>
              Get an email whenever a new article is published.
            </p>
          </div>
          <label style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              style={{ width: 20, height: 20, accentColor: '#d8b04a', cursor: 'pointer' }}
            />
          </label>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      <p className="faint center mt-2" style={{ fontSize: '0.8rem' }}>
        Member since {formatDate(profile?.createdAt)}
      </p>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
