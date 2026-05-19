'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  addDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import Loader from '@/components/Loader';
import { formatDate, timeAgo, getInitials, readingTime, toMillis } from '@/lib/helpers';

export default function ArticlePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [article, setArticle] = useState(undefined); // undefined = loading, null = not found
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [busy, setBusy] = useState(false);

  // Live article document.
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(
      doc(db, 'articles', id),
      (snap) => setArticle(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      (err) => {
        console.error('Article load failed:', err);
        setArticle(null);
      }
    );
    return () => unsub();
  }, [id]);

  // Live comments for this article.
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'comments'), where('articleId', '==', id));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
        setComments(list);
      },
      (err) => console.error('Comments load failed:', err)
    );
    return () => unsub();
  }, [id]);

  if (article === undefined) return <Loader label="Opening article..." />;

  if (article === null) {
    return (
      <div className="panel empty">
        <div className="ei">{'\u{1F4ED}'}</div>
        <h3>Article not found</h3>
        <p>It may have been removed.</p>
        <Link href="/dashboard/browse" className="btn btn-primary mt-2">
          Back to browse
        </Link>
      </div>
    );
  }

  const likes = Array.isArray(article.likes) ? article.likes : [];
  const liked = user ? likes.includes(user.uid) : false;
  const isOwner = user && article.authorId === user.uid;
  const isAdmin = profile?.role === 'admin';
  const canManage = isOwner || isAdmin;

  async function toggleLike() {
    if (!user || busy) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'articles', id), {
        likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likeCount: increment(liked ? -1 : 1),
      });
    } catch (err) {
      console.error('Like failed:', err);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!canManage) return;
    if (!window.confirm('Delete this article permanently?')) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, 'articles', id));
      router.push('/dashboard/browse');
    } catch (err) {
      console.error('Delete failed:', err);
      setBusy(false);
    }
  }

  async function postComment(e) {
    e.preventDefault();
    if (!commentText.trim() || posting) return;
    setPosting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        articleId: id,
        text: commentText.trim(),
        authorId: user.uid,
        authorName: profile?.displayName || 'Anonymous',
        createdAt: serverTimestamp(),
      });
      setCommentText('');
    } catch (err) {
      console.error('Comment failed:', err);
    } finally {
      setPosting(false);
    }
  }

  async function deleteComment(cid) {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteDoc(doc(db, 'comments', cid));
    } catch (err) {
      console.error('Delete comment failed:', err);
    }
  }

  const isLink = article.type === 'link';

  return (
    <div className="reader">
      <Link href="/dashboard/browse" className="btn btn-ghost btn-sm">
        {'\u2190'} Back to browse
      </Link>

      <header className="reader-head mt-2">
        <div className="row wrap">
          <span className={`badge ${isLink ? 'badge-gold' : 'badge-red'}`}>
            {isLink ? 'Curated Link' : 'Article'}
          </span>
          {(article.tags || []).map((t) => (
            <span key={t} className="chip">#{t}</span>
          ))}
        </div>

        <h1>{article.title}</h1>

        <div className="reader-meta">
          <div className="avatar avatar-sm">{getInitials(article.authorName)}</div>
          <span>{article.authorName}</span>
          <span>&middot;</span>
          <span>{formatDate(article.createdAt)}</span>
          {!isLink && (
            <>
              <span>&middot;</span>
              <span>{readingTime(article.content)}</span>
            </>
          )}
        </div>
      </header>

      {article.coverImage && (
        <img className="reader-cover" src={article.coverImage} alt="" />
      )}

      {/* LINK type: in-app viewer */}
      {isLink && (
        <div className="link-viewer">
          <div className="link-viewer-bar">
            <span className="link-viewer-url" title={article.url}>
              {'\u{1F517}'} {article.url}
            </span>
            <a
              className="btn btn-gold btn-sm"
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open original {'\u2197'}
            </a>
          </div>
          <iframe
            src={article.url}
            title={article.title}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            referrerPolicy="no-referrer"
          />
          <div className="link-fallback">
            Viewing this page inside ARTicles. If it appears blank, the site blocks
            embedding &mdash; use the &ldquo;Open original&rdquo; button above.
          </div>
        </div>
      )}

      {/* Body / notes */}
      {article.content && (
        <div className="markdown-body">
          {isLink && (
            <h3 style={{ marginTop: 0 }}>Notes from {article.authorName}</h3>
          )}
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>
      )}

      {/* Action bar */}
      <div className="reader-actions">
        <button
          className={`btn ${liked ? 'btn-danger' : 'btn-ghost'}`}
          onClick={toggleLike}
          disabled={busy}
        >
          <span className={`like-pill ${liked ? 'liked' : ''}`}>
            {'\u2665'} {liked ? 'Liked' : 'Like'} &middot; {likes.length}
          </span>
        </button>

        {canManage && (
          <>
            <Link
              href={`/dashboard/publish?edit=${article.id}`}
              className="btn btn-ghost"
            >
              {'\u270E'} Edit
            </Link>
            <button className="btn btn-danger" onClick={handleDelete} disabled={busy}>
              {'\u{1F5D1}'} Delete
            </button>
          </>
        )}
      </div>

      {/* Comments */}
      <section className="comments">
        <h3>Comments &middot; {comments.length}</h3>

        <form className="comment-form" onSubmit={postComment}>
          <textarea
            className="textarea"
            style={{ minHeight: 90 }}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your thoughts..."
          />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" disabled={posting || !commentText.trim()}>
              {posting ? 'Posting...' : 'Post comment'}
            </button>
          </div>
        </form>

        {comments.length === 0 ? (
          <p className="faint">No comments yet. Be the first to respond.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="comment">
              <div className="avatar avatar-sm">{getInitials(c.authorName)}</div>
              <div className="comment-body">
                <div className="comment-head">
                  <span className="cn">{c.authorName}</span>
                  <span className="ct">&middot; {timeAgo(c.createdAt)}</span>
                </div>
                <div className="comment-text">{c.text}</div>
              </div>
              {(isAdmin || (user && c.authorId === user.uid)) && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteComment(c.id)}
                >
                  Delete
                </button>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
