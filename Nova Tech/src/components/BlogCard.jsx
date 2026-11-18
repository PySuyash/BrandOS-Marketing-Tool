import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import MediaFrame from './MediaFrame.jsx';

export function formatInsightDate(iso) {
  if (!iso) return 'Recent';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return 'Recent';
  }
}

export default function BlogCard({ article }) {
  const excerpt = article.excerpt || article.summary || '';
  const readingTime = article.readingTime || article.readTime || '4 min read';

  return (
    <article className="group flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden transition-colors hover:border-blue-300">
      <Link to={`/insights/${article.slug}`} className="block aspect-[4/3] overflow-hidden">
        <MediaFrame
          src={article.coverImage}
          alt={article.title}
          fallbackTitle={article.category}
          className="w-full h-full"
          imgClassName="transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </Link>

      <div className="flex flex-col flex-1 justify-between p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
            <span className="font-semibold text-blue-700">{article.category}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={article.publishedAt}>{formatInsightDate(article.publishedAt)}</time>
            <span aria-hidden="true">·</span>
            <span>{readingTime}</span>
          </div>

          <Link to={`/insights/${article.slug}`}>
            <h3 className="font-display text-lg font-bold text-slate-950 tracking-tight leading-snug group-hover:text-blue-700 transition-colors">
              {article.title}
            </h3>
          </Link>

          <p className="mt-2.5 text-sm text-slate-600 leading-relaxed line-clamp-3">
            {excerpt}
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 truncate">
            {article.authorName} · {article.department}
          </span>
          <Link
            to={`/insights/${article.slug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0"
          >
            <span>Read Article</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
