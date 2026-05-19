'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Loader from '@/components/Loader';
import { formatDate, makeExcerpt, toMillis } from '@/lib/helpers';

export default function TopLikedPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'articles'));
        if (!active) return;
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .map((a) => ({ ...a, _likes: Array.isArray(a.likes) ? a.likes.length : 0 }))
          .sort((a, b) => b._likes - a._likes || toMillis(b.createdAt) - toMillis(a.createdAt));
        setArticles(list);
      } catch (err) {
        console.error('Top liked load failed:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <Loader label="Counting the love..." />;

  return (
    <div>
      <div className="page-head">
        <h1>Top Liked</h1>
        <p>The most loved articles and links on ARTicles, ranked.</p>
      </div>

      {articles.length === 0 ? (
        <div className="panel empty">
          <div className="ei">{'\u2665'}</div>
          <h3>No articles to rank yet</h3>
          <p>Once articles get likes, they will show up here.</p>
          <Link href="/dashboard/publish" className="btn btn-primary mt-2">
            Publish an article
          </Link>
        </div>
      ) : (
        <div className="stack">
          {articles.map((a, i) => (
            <Link
              key={a.id}
              href={`/dashboard/article/${a.id}`}
              className="panel"
              style={{ display: 'flex', gap: 16, alignItems: 'center' }}
            >
              <div className={`rank ${i < 3 ? 'r' + (i + 1) : ''}`}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row wrap" style={{ gap: 8 }}>
                  <span className={`badge ${a.type === 'link' ? 'badge-gold' : 'badge-red'}`}>
                    {a.type === 'link' ? 'Link' : 'Article'}
                  </span>
                  <strong style={{ fontSize: '1.05rem' }}>{a.title}</strong>
                </div>
                <p className="muted" style={{ fontSize: '0.86rem', marginTop: 4 }}>
                  {makeExcerpt(a.excerpt || a.content, 110)}
                </p>
                <p className="faint" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                  {a.authorName} &middot; {formatDate(a.createdAt)}
                </p>
              </div>
              <div className="center">
                <div className="gold" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {a._likes}
                </div>
                <div className="faint" style={{ fontSize: '0.74rem' }}>likes</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
