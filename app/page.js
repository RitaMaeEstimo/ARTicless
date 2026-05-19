'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

const FEATURES = [
  { icon: '\u270E', title: 'Write & Publish', desc: 'Compose rich articles with Markdown support and share them instantly.' },
  { icon: '\u2197', title: 'Curate Links', desc: 'Save external links that open inside ARTicles \u2014 no leaving the app.' },
  { icon: '\u2665', title: 'Like & Discuss', desc: 'Like, unlike and comment on every article in the community feed.' },
  { icon: '\u2709', title: 'Email Alerts', desc: 'Get notified by email the moment a new article goes live.' },
];

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="landing">
      <header className="landing-nav">
        <span className="brand" style={{ fontSize: '1.6rem' }}>
          <span className="art">ART</span>
          <span className="icles">icles</span>
          <span className="dot">.</span>
        </span>
        <div className="row">
          {!loading && user ? (
            <Link href="/dashboard" className="btn btn-gold btn-sm">Go to Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link href="/signup" className="btn btn-primary btn-sm">Get started</Link>
            </>
          )}
        </div>
      </header>

      <section className="hero">
        <span className="eyebrow">Read &middot; Write &middot; Share</span>
        <h1>
          Where <span className="ink">words</span> become<br />
          <span className="gild">articles</span>.
        </h1>
        <p>
          ARTicles is a modern publishing platform. Write your own pieces, curate the
          best links from across the web, and join a community that reads deeply.
        </p>
        <div className="hero-actions">
          {!loading && user ? (
            <Link href="/dashboard" className="btn btn-primary">Open Dashboard</Link>
          ) : (
            <>
              <Link href="/signup" className="btn btn-primary">Create free account</Link>
              <Link href="/login" className="btn btn-ghost">I already have an account</Link>
            </>
          )}
        </div>
      </section>

      <section className="feature-grid">
        {FEATURES.map((f) => (
          <div key={f.title} className="feature panel">
            <div className="ficon gold">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
