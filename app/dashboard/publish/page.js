'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import Loader from '@/components/Loader';
import { parseTags, makeExcerpt, normalizeUrl } from '@/lib/helpers';

function PublishForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('edit');
  const { user, profile } = useAuth();

  const [type, setType] = useState('article');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [tags, setTags] = useState('');
  const [preview, setPreview] = useState(false);

  const [loadingDoc, setLoadingDoc] = useState(Boolean(editId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Load existing article when editing.
  useEffect(() => {
    if (!editId) return;
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'articles', editId));
        if (!active) return;
        if (!snap.exists()) {
          setError('That article could not be found.');
        } else {
          const a = snap.data();
          const canEdit = a.authorId === user.uid || profile?.role === 'admin';
          if (!canEdit) {
            setError('You do not have permission to edit this article.');
          } else {
            setType(a.type || 'article');
            setTitle(a.title || '');
            setUrl(a.url || '');
            setContent(a.content || '');
            setExcerpt(a.excerpt || '');
            setCoverImage(a.coverImage || '');
            setTags(Array.isArray(a.tags) ? a.tags.join(', ') : '');
          }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load the article.');
      } finally {
        if (active) setLoadingDoc(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [editId, user, profile]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please add a title.');
      return;
    }
    if (type === 'link' && !url.trim()) {
      setError('Please paste the link URL.');
      return;
    }
    if (type === 'article' && !content.trim()) {
      setError('Please write some content for your article.');
      return;
    }

    setBusy(true);
    try {
      const data = {
        type,
        title: title.trim(),
        content: content.trim(),
        url: type === 'link' ? normalizeUrl(url) : '',
        excerpt: (excerpt.trim() || makeExcerpt(content)) || title.trim(),
        coverImage: coverImage.trim(),
        tags: parseTags(tags),
        updatedAt: serverTimestamp(),
      };

      if (editId) {
        await updateDoc(doc(db, 'articles', editId), data);
        router.push(`/dashboard/article/${editId}`);
      } else {
        const ref = await addDoc(collection(db, 'articles'), {
          ...data,
          authorId: user.uid,
          authorName: profile?.displayName || 'Anonymous',
          likes: [],
          likeCount: 0,
          createdAt: serverTimestamp(),
        });

        // Fire-and-forget email notification (skips silently if not configured).
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articleId: ref.id,
            articleTitle: data.title,
            authorName: profile?.displayName || 'Anonymous',
          }),
        }).catch(() => {});

        router.push(`/dashboard/article/${ref.id}`);
      }
    } catch (err) {
      console.error('Publish failed:', err);
      setError('Could not publish. Please check your connection and try again.');
      setBusy(false);
    }
  }

  if (loadingDoc) return <Loader label="Loading article..." />;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="page-head">
        <h1>{editId ? 'Edit article' : 'Publish something new'}</h1>
        <p>Write an original article or share a link the community should read.</p>
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        {error && <div className="notice notice-error">{error}</div>}

        {/* type selector */}
        <div className="type-toggle">
          <button
            type="button"
            className={`type-opt ${type === 'article' ? 'active' : ''}`}
            onClick={() => setType('article')}
          >
            <span className="to-t">{'\u270E'} Write an Article</span>
            <span className="to-d">Compose original content with Markdown.</span>
          </button>
          <button
            type="button"
            className={`type-opt ${type === 'link' ? 'active' : ''}`}
            onClick={() => setType('link')}
          >
            <span className="to-t">{'\u2197'} Share a Link</span>
            <span className="to-d">Curate a link that opens inside ARTicles.</span>
          </button>
        </div>

        <div className="panel stack">
          <div className="field">
            <label className="label">Title</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'link' ? 'Give this link a clear title' : 'Your article headline'}
              required
            />
          </div>

          {type === 'link' && (
            <div className="field">
              <label className="label">Link URL</label>
              <input
                className="input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/great-read"
              />
              <span className="faint" style={{ fontSize: '0.8rem' }}>
                Readers open this inside ARTicles. Some sites block embedding &mdash; a
                one-tap fallback button is always shown.
              </span>
            </div>
          )}

          <div className="field">
            <label className="label">Cover image URL (optional)</label>
            <input
              className="input"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://images.example.com/cover.jpg"
            />
          </div>

          <div className="field">
            <label className="label">Tags (comma separated)</label>
            <input
              className="input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="design, productivity, opinion"
            />
          </div>

          <div className="field">
            <div className="spread">
              <label className="label">
                {type === 'link' ? 'Why should people read this?' : 'Content'}
              </label>
              {type === 'article' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPreview((v) => !v)}
                >
                  {preview ? 'Write' : 'Preview'}
                </button>
              )}
            </div>

            {preview && type === 'article' ? (
              <div className="panel markdown-body" style={{ minHeight: 200 }}>
                {content ? (
                  <ReactMarkdown>{content}</ReactMarkdown>
                ) : (
                  <p className="faint">Nothing to preview yet.</p>
                )}
              </div>
            ) : (
              <textarea
                className="textarea"
                style={{ minHeight: type === 'link' ? 120 : 280 }}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  type === 'link'
                    ? 'Add a short summary or your notes about this link...'
                    : 'Write your article here. Markdown is supported:\n\n# Heading\n**bold**  *italic*\n- list item\n> a quote'
                }
              />
            )}
          </div>

          <div className="field">
            <label className="label">Short excerpt (optional)</label>
            <input
              className="input"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Auto-generated from your content if left blank"
            />
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.back()}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy
              ? 'Publishing...'
              : editId
              ? 'Save changes'
              : 'Publish now'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PublishPage() {
  return (
    <Suspense fallback={<Loader label="Loading editor..." />}>
      <PublishForm />
    </Suspense>
  );
}
