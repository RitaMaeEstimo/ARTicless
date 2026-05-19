'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Sidebar from '@/components/Sidebar';
import Loader from '@/components/Loader';

const TITLES = {
  '/dashboard': 'Overview',
  '/dashboard/publish': 'Publish',
  '/dashboard/browse': 'Browse Articles',
  '/dashboard/top-liked': 'Top Liked',
  '/dashboard/settings': 'Settings',
  '/dashboard/admin': 'Admin Dashboard',
};

export default function DashboardLayout({ children }) {
  const {user, profile, loading, configured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  if (!configured) {
    return (
      <div className="page-loader">
        <h2 className="gold">Firebase not configured</h2>
        <p className="muted" style={{ maxWidth: 420, textAlign: 'center' }}>
          Add your Firebase keys to <code>.env.local</code> and restart the dev server.
          Full instructions are in the README.
        </p>
        <Link href="/" className="btn btn-ghost">Back home</Link>
      </div>
    );
  }

  if (loading) return <Loader label="Preparing your dashboard..." />;
  if (!user) return <Loader label="Redirecting..." />;

  let title = 'Dashboard';
  for (const [path, name] of Object.entries(TITLES)) {
    if (path === '/dashboard' ? pathname === path : pathname.startsWith(path)) title = name;
  }

  return (
    <div className="shell">
      {navOpen && <div className="sidebar-backdrop" onClick={() => setNavOpen(false)} />}
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="main">
        <header className="topbar">
          <div className="row">
            <button
              className="hamburger"
              onClick={() => setNavOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {'\u2630'}
            </button>
            <h2>{title}</h2>
          </div>
          {profile?.role === 'admin' && (
            <Link href="/dashboard/publish" className="btn btn-primary btn-sm">
              + New
            </Link>
          )}
        </header>

        <div className="content">{children}</div>
      </div>
    </div>
  );
}
