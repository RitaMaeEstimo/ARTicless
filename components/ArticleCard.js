'use client';

import Link from 'next/link';
import { formatDate, makeExcerpt } from '@/lib/helpers';

export default function ArticleCard({ article }) {
  const isLink = article.type === 'link';
  const excerpt = article.excerpt || makeExcerpt(article.content || article.description || '');
  const likeCount = Array.isArray(article.likes) ? article.likes.length : article.likeCount || 0;

  return (
    <Link href={`/dashboard/article/${article.id}`} className="acard">
      <div className="acard-cover">
        {article.coverImage ? (
          <img src={article.coverImage} alt="" />
        ) : (
          <div className="ph">{isLink ? '\u2197' : 'A'}</div>
        )}
        <span className="acard-type">
          <span className={`badge ${isLink ? 'badge-gold' : 'badge-red'}`}>
            {isLink ? 'Link' : 'Article'}
          </span>
        </span>
      </div>

      <div className="acard-body">
        <h3>{article.title}</h3>
        <p className="acard-excerpt">{excerpt || 'No description provided.'}</p>

        {Array.isArray(article.tags) && article.tags.length > 0 && (
          <div className="acard-tags">
            {article.tags.slice(0, 3).map((t) => (
              <span key={t} className="chip">#{t}</span>
            ))}
          </div>
        )}

        <div className="acard-foot">
          <span>{article.authorName || 'Unknown'} \u00b7 {formatDate(article.createdAt)}</span>
          <span className="like-pill">{'\u2665'} {likeCount}</span>
        </div>
      </div>
    </Link>
  );
}
