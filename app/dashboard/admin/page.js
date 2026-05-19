'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import Loader from '@/components/Loader';
import { formatDate, toMillis } from '@/lib/helpers';

export default function AdminPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState('articles');
  const [articles, setArticles] = useState([]);
  const [users, setUsers] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const isAdmin = profile?.role === 'admin';

  async function loadAll() {
    setLoading(true);
    try {
      const [a, u, c] = await Promise.all([
        getDocs(collection(db, 'articles')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'comments')),
      ]);
      setArticles(
        a.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((x, y) => toMillis(y.createdAt) - toMillis(x.createdAt))
      );
      setUsers(
        u.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((x, y) => toMillis(x.createdAt) - toMillis(y.createdAt))
      );
      setComments(
        c.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((x, y) => toMillis(y.createdAt) - toMillis(x.createdAt))
      );
    } catch (err) {
      console.error('Admin load failed:', err);
      setToast('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) loadAll();
    else setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const stats = useMemo(() => {
    const totalLikes = articles.reduce(
      (s, a) => s + (Array.isArray(a.likes) ? a.likes.length : 0),
      0
    );
    return {
      articles: articles.length,
      users: users.length,
      comments: comments.length,
      likes: totalLikes,
    };
  }, [articles, users, comments]);

  if (!isAdmin) {
    return (
      <div className="panel empty">
        <div className="ei">{'\u{1F512}'}</div>
        <h3>Admins only</h3>
        <p>You do not have permission to view the admin dashboard.</p>
        <Link href="/dashboard" className="btn btn-primary mt-2">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (loading) return <Loader label="Loading admin data..." />;

  async function removeArticle(id) {
    if (!window.confirm('Delete this article permanently?')) return;
    try {
      await deleteDoc(doc(db, 'articles', id));
      setArticles((prev) => prev.filter((a) => a.id !== id));
      setToast('Article deleted.');
    } catch (err) {
      console.error(err);
      setToast('Delete failed.');
    }
  }

  async function removeComment(id) {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteDoc(doc(db, 'comments', id));
      setComments((prev) => prev.filter((c) => c.id !== id));
      setToast('Comment deleted.');
    } catch (err) {
      console.error(err);
      setToast('Delete failed.');
    }
  }

  async function changeRole(id, role) {
    try {
      await updateDoc(doc(db, 'users', id), { role });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
      setToast('Role updated.');
    } catch (err) {
      console.error(err);
      setToast('Could not update role.');
    }
  }

  async function removeUser(id) {
    if (
      !window.confirm(
        'Remove this user record? This deletes their ARTicles profile (their login still exists in Firebase Auth).'
      )
    )
      return;
    try {
      await deleteDoc(doc(db, 'users', id));
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setToast('User record removed.');
    } catch (err) {
      console.error(err);
      setToast('Delete failed.');
    }
  }

  const TABS = [
    { key: 'articles', label: `Articles (${articles.length})` },
    { key: 'users', label: `Users (${users.length})` },
    { key: 'comments', label: `Comments (${comments.length})` },
  ];

  return (
    <div>
      <div className="page-head">
        <h1>Admin Dashboard</h1>
        <p>Manage all content and members across ARTicles.</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: 26 }}>
        <div className="stat"><div className="si gold">{'\u25A4'}</div><div className="sv">{stats.articles}</div><div className="sl">Articles</div></div>
        <div className="stat"><div className="si gold">{'\u{1F465}'}</div><div className="sv">{stats.users}</div><div className="sl">Members</div></div>
        <div className="stat"><div className="si gold">{'\u{1F4AC}'}</div><div className="sv">{stats.comments}</div><div className="sl">Comments</div></div>
        <div className="stat"><div className="si gold">{'\u2665'}</div><div className="sv">{stats.likes}</div><div className="sl">Total Likes</div></div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ARTICLES */}
      {tab === 'articles' && (
        articles.length === 0 ? (
          <div className="panel empty"><div className="ei">{'\u{1F4DD}'}</div><h3>No articles</h3></div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Title</th><th>Type</th><th>Author</th>
                  <th>Likes</th><th>Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/dashboard/article/${a.id}`} className="gold">
                        {a.title}
                      </Link>
                    </td>
                    <td><span className={`badge ${a.type === 'link' ? 'badge-gold' : 'badge-red'}`}>{a.type || 'article'}</span></td>
                    <td>{a.authorName}</td>
                    <td>{Array.isArray(a.likes) ? a.likes.length : 0}</td>
                    <td className="faint">{formatDate(a.createdAt)}</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => removeArticle(a.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* USERS */}
      {tab === 'users' && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Role</th>
                <th>Joined</th><th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.displayName || '\u2014'}</td>
                  <td className="faint">{u.email}</td>
                  <td>
                    <select
                      className="select"
                      value={u.role || 'user'}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      disabled={u.id === user.uid}
                      style={{ width: 'auto', padding: '6px 10px' }}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="faint">{formatDate(u.createdAt)}</td>
                  <td>
                    {u.id === user.uid ? (
                      <span className="faint" style={{ fontSize: '0.8rem' }}>You</span>
                    ) : (
                      <button className="btn btn-danger btn-sm" onClick={() => removeUser(u.id)}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* COMMENTS */}
      {tab === 'comments' && (
        comments.length === 0 ? (
          <div className="panel empty"><div className="ei">{'\u{1F4AC}'}</div><h3>No comments</h3></div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Comment</th><th>Author</th><th>Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c) => (
                  <tr key={c.id}>
                    <td>{c.text}</td>
                    <td>{c.authorName}</td>
                    <td className="faint">{formatDate(c.createdAt)}</td>
                    <td>
                      <div className="row">
                        <Link href={`/dashboard/article/${c.articleId}`} className="btn btn-ghost btn-sm">
                          View
                        </Link>
                        <button className="btn btn-danger btn-sm" onClick={() => removeComment(c.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
