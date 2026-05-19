'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from '@/lib/firebase';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  configured: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load (and create if missing) the Firestore profile for a signed-in user.
  async function loadProfile(u) {
    const ref = doc(db, 'users', u.uid);
    const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase().trim();
    const isAdminEmail = adminEmail && u.email && u.email.toLowerCase() === adminEmail;

    let snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        email: u.email,
        displayName: u.displayName || (u.email ? u.email.split('@')[0] : 'Reader'),
        role: isAdminEmail ? 'admin' : 'user',
        emailNotifications: true,
        createdAt: serverTimestamp(),
      });
      snap = await getDoc(ref);
    } else if (isAdminEmail && snap.data().role !== 'admin') {
      // Promote configured admin email on next visit.
      await setDoc(ref, { role: 'admin' }, { merge: true });
      snap = await getDoc(ref);
    }

    return { id: u.uid, ...snap.data() };
  }

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          setUser(u);
          setProfile(await loadProfile(u));
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Auth profile load failed:', err);
        setUser(u || null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  async function refreshProfile() {
    if (auth.currentUser) {
      try {
        setProfile(await loadProfile(auth.currentUser));
      } catch (err) {
        console.error('refreshProfile failed:', err);
      }
    }
  }

  async function signOut() {
    await fbSignOut(auth);
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, configured: firebaseConfigured, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
