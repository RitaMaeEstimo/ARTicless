'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import ArticleCard from '@/components/ArticleCard';
import Loader from '@/components/Loader';
import { toMillis } from '@/lib/helpers';

export default function BrowsePage() {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [sort, setSort] = useState('newest');
  const [scope, setScope] = useState('all'); // all | mine

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'articles'));
        if (!active) return;
        setArticles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Browse load failed:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const allTags = useMemo(() => {
    const set = new Set();
    articles.forEach((a) => (a.tags || []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [articles]);

  const filtered = useMemo(() => {
    let list = [...articles];

    if (scope === 'mine') list = list.filter((a) => a.authorId === user?.uid);
    if (activeTag) list = list.filter((a) => (a.tags || []).includes(activeTag));

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((a) =>
        [a.title, a.excerpt, a.content, a.authorName, ...(a.tags || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }

    const likeCount = (a) => (Array.isArray(a.likes) ? a.likes.length : 0);
    if (sort === 'newest') list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    else if (sort === 'oldest') list.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
    else if (sort === 'liked') list.sort((a, b) => likeCount(b) - likeCount(a));

    return list;
  }, [articles, scope, activeTag, search, sort, user]);

  if (loading) return <Loader label="Loading articles..." />;

  return (
    <div>
      <div className="page-head">
        <h1>Browse Articles</h1>
        <p>Explore every article and curated link on ARTicles.</p>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <span className="si">{'\u2315'}</span>
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, author or tag..."
          />
        </div>
        <select className="select" value={scope} onChange={(e) => setScope(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">All articles</option>
          <option value="mine">My articles</option>
        </select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 'auto' }}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="liked">Most liked</option>
        </select>
      </div>

      {allTags.length > 0 && (
        <div className="row wrap" style={{ marginBottom: 22 }}>
          <button
            className={`chip ${activeTag === '' ? 'active' : ''}`}
            onClick={() => setActiveTag('')}
          >
            All tags
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              className={`chip ${activeTag === t ? 'active' : ''}`}
              onClick={() => setActiveTag(activeTag === t ? '' : t)}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="panel empty">
          <div className="ei">{'\u{1F50D}'}</div>
          <h3>Nothing found</h3>
          <p>Try a different search, or publish the first article.</p>
          <Link href="/dashboard/publish" className="btn btn-primary mt-2">
            Publish an article
          </Link>
        </div>
      ) : (
        <>
          <p className="muted" style={{ marginBottom: 14, fontSize: '0.88rem' }}>
            {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
          </p>
          <div className="article-grid">
            {filtered.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
