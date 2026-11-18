import { useEffect } from 'react';
import { ShieldAlert, ShieldCheck, X } from 'lucide-react';
import MediaFrame from './MediaFrame.jsx';
import { formatInsightDate } from './BlogCard.jsx';

export default function ArticlePreviewModal({ open, article, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !article) return null;

  const paragraphs = String(article.content || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const excerpt = article.excerpt || article.summary || '';
  const tags = Array.isArray(article.tags) ? article.tags : [];
  const readingTime = article.readingTime || article.readTime || '4 min read';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-preview-title"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Preview Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4 shrink-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-950">Editorial Preview</span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span className="capitalize text-slate-600">
              Status: {String(article.status || 'draft').replace(/_/g, ' ')}
            </span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            {article.isPublic ? (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Publicly Visible</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-amber-800">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Internal Preview Only (Not Public)</span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close article preview"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Editorial Body */}
        <div className="overflow-y-auto p-6 sm:p-10 space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-blue-700">
              {article.category || 'Uncategorized'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {article.publishedAt
                ? formatInsightDate(article.publishedAt)
                : 'Unpublished Draft'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{readingTime}</span>
          </div>

          <h2
            id="article-preview-title"
            className="font-display text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight leading-tight"
          >
            {article.title || 'Untitled Draft'}
          </h2>

          {excerpt && (
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">{excerpt}</p>
          )}

          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <span className="font-semibold text-slate-950">
                {article.authorName || 'NovaTech Editorial'}
              </span>
              {article.department && (
                <span className="text-slate-500"> · {article.department}</span>
              )}
            </div>
            {article.brandosSubmissionId && (
              <span className="font-mono text-xs text-slate-500">
                BrandOS {article.brandosSubmissionId}
              </span>
            )}
          </div>

          {article.coverImage && (
            <div className="rounded-xl overflow-hidden border border-slate-200 aspect-[16/9]">
              <MediaFrame
                src={article.coverImage}
                alt={article.title || 'Preview cover'}
                fallbackTitle={article.title || 'Article Preview'}
                className="w-full h-full"
              />
            </div>
          )}

          <div className="space-y-5 text-base text-slate-800 leading-relaxed">
            {paragraphs.length > 0 ? (
              paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
            ) : (
              <p className="italic text-slate-400">No article body content entered yet.</p>
            )}
          </div>

          {tags.length > 0 && (
            <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-xs font-semibold text-slate-500">Topics</span>
              {tags.map((tag) => (
                <span key={tag} className="text-blue-700 font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
