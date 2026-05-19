'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import ArticleCard from '@/components/ArticleCard';
import Loader from '@/components/Loader';
import { toMillis } from '@/lib/helpers';

export default function OverviewPage() {
  const { user, profile } = useAuth();
  const [articles, setArticles] = useState([]);
  const [stats, setStats] = useState({ articles: 0, likes: 0, comments: 0, mine: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [artSnap, comSnap] = await Promise.all([
          getDocs(collection(db, 'articles')),
          getDocs(collection(db, 'comments')),
        ]);

        const arts = artSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

        const totalLikes = arts.reduce(
          (sum, a) => sum + (Array.isArray(a.likes) ? a.likes.length : 0),
          0
        );
        const mine = arts.filter((a) => a.authorId === user.uid).length;

        let userCount = 0;
        if (profile?.role === 'admin') {
          try {
            const uSnap = await getDocs(collection(db, 'users'));
            userCount = uSnap.size;
          } catch {
            userCount = 0;
          }
        }

        if (!active) return;
        setArticles(arts);
        setStats({
          articles: arts.length,
          likes: totalLikes,
          comments: comSnap.size,
          mine,
          users: userCount,
        });
      } catch (err) {
        console.error('Overview load failed:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user, profile]);

  if (loading) return <Loader label="Loading overview..." />;

  const cards = [
    { icon: '\u25A4', label: 'Total Articles', value: stats.articles },
    { icon: '\u2665', label: 'Total Likes', value: stats.likes },
    { icon: '\u{1F4AC}', label: 'Comments', value: stats.comments },
    { icon: '\u270E', label: 'Your Articles', value: stats.mine },
  ];
  if (profile?.role === 'admin') {
    cards.push({ icon: '\u{1F465}', label: 'Members', value: stats.users });
  }

  return (
    <div>
      <div className="page-head">
        <h1>
          Welcome back, <span className="gold">{profile?.displayName || 'Reader'}</span>
        </h1>
        <p>Here is what is happening across ARTicles today.</p>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className="stat">
            <div className="si gold">{c.icon}</div>
            <div className="sv">{c.value}</div>
            <div className="sl">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="spread mt-3" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.4rem' }}>Latest articles</h2>
        <Link href="/dashboard/browse" className="btn btn-ghost btn-sm">
          Browse all
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="panel empty">
          <div className="ei">{'\u{1F4DD}'}</div>
          <h3>No articles yet</h3>
          <p>Be the first to publish something on ARTicles.</p>
          <Link href="/dashboard/publish" className="btn btn-primary mt-2">
            Publish an article
          </Link>
        </div>
      ) : (
        <div className="article-grid">
          {articles.slice(0, 6).map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
