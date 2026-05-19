// Small shared helpers used across the app.

// Convert a Firestore Timestamp (or null) to milliseconds.
export function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  return 0;
}

// "May 20, 2026"
export function formatDate(ts) {
  const ms = toMillis(ts);
  if (!ms) return 'Just now';
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// "3 hours ago"
export function timeAgo(ts) {
  const ms = toMillis(ts);
  if (!ms) return 'just now';
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min > 1 ? 's' : ''} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr > 1 ? 's' : ''} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day > 1 ? 's' : ''} ago`;
  return formatDate(ts);
}

// Initials for an avatar circle.
export function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Build a short preview from article content.
export function makeExcerpt(text = '', max = 160) {
  const clean = String(text).replace(/[#*_>`\[\]]/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trim() + '...';
}

// Estimated reading time.
export function readingTime(text = '') {
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

// Normalize a list of comma/space separated tags.
export function parseTags(input = '') {
  return [...new Set(
    String(input)
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
  )].slice(0, 8);
}

// Make sure a URL has a protocol.
export function normalizeUrl(url = '') {
  const u = String(url).trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return 'https://' + u;
}
