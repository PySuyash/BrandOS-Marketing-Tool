import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Link2, Mail, Share2, ShieldCheck } from 'lucide-react';
import { apiClient, extractApiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import MediaFrame from '../components/MediaFrame.jsx';
import BlogCard, { formatInsightDate } from '../components/BlogCard.jsx';
import { PageLoadingState } from '../components/LoadingSkeleton.jsx';

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const { addToast } = useToast();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setCopied(false);

    apiClient
      .get(`/insights/${slug}`)
      .then(({ data }) => {
        if (!active) return;
        setArticle(data.article);
        setRelated(Array.isArray(data.related) ? data.related : []);
      })
      .catch((err) => {
        if (!active) return;
        setError(extractApiError(err, 'Article not found or not published publicly.'));
        setArticle(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!article) return undefined;
    const prevTitle = document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc ? metaDesc.getAttribute('content') : null;

    document.title = article.seoTitle || `${article.title} | NovaTech Insights`;
    if (metaDesc && (article.seoDescription || article.excerpt || article.summary)) {
      metaDesc.setAttribute(
        'content',
        article.seoDescription || article.excerpt || article.summary
      );
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc !== null) {
        metaDesc.setAttribute('content', prevDesc);
      }
    };
  }, [article]);

  const handleCopyShareLink = async () => {
    const shareUrl = window.location.href;
    let success = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        success = true;
      }
    } catch {
      success = false;
    }

    if (!success) {
      try {
        const input = document.createElement('textarea');
        input.value = shareUrl;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        success = document.execCommand('copy');
        document.body.removeChild(input);
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopied(true);
      addToast('Article URL copied to clipboard.', 'success');
      setTimeout(() => setCopied(false), 2500);
    } else {
      addToast('Copy URL manually from your browser address bar.', 'info');
    }
  };

  if (loading) {
    return <PageLoadingState label="Loading published article..." />;
  }

  if (error || !article) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-950">
          Article Not Available Publicly
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
          {error ||
            'This article either does not exist or has not completed BrandOS approval and publication.'}
        </p>
        <Link
          to="/insights"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Insights</span>
        </Link>
      </div>
    );
  }

  const paragraphs = String(article.content || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const readingTime = article.readingTime || article.readTime || '4 min read';
  const excerpt = article.excerpt || article.summary || '';
  const tags = Array.isArray(article.tags) ? article.tags : [];
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const mailShareHref = `mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(`${excerpt}\n\nRead at NovaTech Insights: ${currentUrl}`)}`;
  const linkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`;

  return (
    <div>
      <article className="bg-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/insights"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950 mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Insights</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500 mb-4">
            <span className="font-semibold text-blue-700">{article.category}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={article.publishedAt}>{formatInsightDate(article.publishedAt)}</time>
            <span aria-hidden="true">·</span>
            <span>{readingTime}</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-bold text-slate-950 tracking-tight text-balance leading-[1.12]">
            {article.title}
          </h1>

          <p className="mt-5 text-lg text-slate-600 leading-relaxed">{excerpt}</p>

          <div className="mt-6 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-sm">
            <div>
              <span className="font-semibold text-slate-950">{article.authorName}</span>
              <span className="text-slate-500"> · {article.authorRole || article.department}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 tabular-nums">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>BrandOS Verified · {article.brandosSubmissionId}</span>
            </div>
          </div>

          <div className="mt-8 rounded-2xl overflow-hidden border border-slate-200 aspect-[16/9]">
            <MediaFrame
              src={article.coverImage}
              alt={article.title}
              fallbackTitle={article.title}
              className="w-full h-full"
            />
          </div>

          <div className="mt-10 space-y-6 text-base sm:text-lg text-slate-800 leading-relaxed max-w-3xl">
            {paragraphs.map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>

          {/* Tags & Share Footer */}
          <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            {tags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="text-xs font-semibold text-slate-500">Topics</span>
                {tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/insights?tag=${encodeURIComponent(tag)}`}
                    className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            ) : (
              <div />
            )}

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </span>
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:border-blue-400 rounded-lg transition-colors whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
              <a
                href={linkedInHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:border-blue-400 rounded-lg transition-colors whitespace-nowrap"
              >
                LinkedIn
              </a>
              <a
                href={mailShareHref}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:border-blue-400 rounded-lg transition-colors whitespace-nowrap"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </a>
            </div>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="py-16 bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold text-slate-950 mb-8">
              Related Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((item) => (
                <BlogCard key={item.id} article={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
