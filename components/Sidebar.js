'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getInitials } from '@/lib/helpers';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: '\u25C9', exact: true },
  { href: '/dashboard/browse', label: 'Browse Articles', icon: '\u25A4' },
  { href: '/dashboard/top-liked', label: 'Top Liked', icon: '\u2665' },
  { href: '/dashboard/settings', label: 'Settings', icon: '\u2699' },
];

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const isActive = (item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <Link href="/dashboard" className="sidebar-brand brand" onClick={onClose}>
        <span className="art">ART</span>
        <span className="icles">icles</span>
        <span className="dot">.</span>
      </Link>

      <nav className="nav">
        <div className="nav-section">Menu</div>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`nav-item ${isActive(item) ? 'active' : ''}`}
          >
            <span className="ic">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {profile?.role === 'admin' && (
          <>
            <div className="nav-section">Administration</div>
            <Link
              href="/dashboard/admin"
              onClick={onClose}
              className={`nav-item ${pathname.startsWith('/dashboard/admin') ? 'active' : ''}`}
            >
              <span className="ic">{'\u26A1'}</span>
              Admin Dashboard
            </Link>
          </>
        )}
      </nav>

      <div className="sidebar-foot">
        <div className="sidebar-user">
          <div className="avatar">{getInitials(profile?.displayName || 'R')}</div>
          <div className="meta">
            <div className="nm">{profile?.displayName || 'Reader'}</div>
            <div className="rl">{profile?.role || 'user'}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm btn-block mt-1" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
