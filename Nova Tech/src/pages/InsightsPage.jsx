import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import { apiClient, extractApiError } from '../api/client.js';
import SectionHeading from '../components/SectionHeading.jsx';
import BlogCard, { formatInsightDate } from '../components/BlogCard.jsx';
import MediaFrame from '../components/MediaFrame.jsx';
import { CardSkeleton } from '../components/LoadingSkeleton.jsx';

const PAGE_LIMIT = 6;

export default function InsightsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTagParam = searchParams.get('tag') || '';

  const [articles, setArticles] = useState([]);
  const [featuredArticle, setFeaturedArticle] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 220);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchInsights = useCallback(
    async ({ pageToLoad = 1, append = false } = {}) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params = {
          page: pageToLoad,
          limit: PAGE_LIMIT,
          excludeFeatured: 'true',
        };
        if (selectedCategory !== 'All') params.category = selectedCategory;
        if (activeTagParam) params.tag = activeTagParam;
        if (debouncedQuery) params.q = debouncedQuery;

        const { data } = await apiClient.get('/insights', { params });
        const incoming = Array.isArray(data.articles) ? data.articles : [];

        setArticles((prev) => (append ? [...prev, ...incoming] : incoming));
        if (!append) {
          setFeaturedArticle(data.featuredArticle || null);
        }
        setCategories(Array.isArray(data.categories) ? data.categories : []);
        setTotal(Number(data.total || 0));
        setHasMore(Boolean(data.hasMore));
        setPage(pageToLoad);
      } catch (err) {
        setError(extractApiError(err, 'Unable to load published Insights.'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedCategory, activeTagParam, debouncedQuery]
  );

  useEffect(() => {
    fetchInsights({ pageToLoad: 1, append: false });
  }, [fetchInsights]);

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
  };

  const handleClearTag = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('tag');
    setSearchParams(next);
  };

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSearchInput('');
    setDebouncedQuery('');
    if (activeTagParam) {
      handleClearTag();
    }
  };

  const hasResults = Boolean(featuredArticle) || articles.length > 0;

  return (
    <div>
      <section className="bg-slate-950 text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            as="h1"
            dark
            eyebrow="NovaTech Insights"
            title="Ideas. Innovation. Insights."
            description="Perspectives from NovaTech on software engineering, artificial intelligence, digital transformation, cloud reliability, and modern business strategy."
          />
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search and Category Filter Controls */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-8 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              {['All', ...categories].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-slate-950 text-white border-slate-950'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:text-slate-950'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-80">
              <label htmlFor="insights-search" className="sr-only">
                Search published articles by title, description, content, or tags
              </label>
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="insights-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search titles, topics, content, or tags..."
                className="w-full pl-10 pr-9 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-700"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setDebouncedQuery('');
                  }}
                  aria-label="Clear search query"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {activeTagParam && (
            <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
              <span className="text-slate-700">
                Filtering insights tagged with{' '}
                <strong className="font-semibold text-slate-950">#{activeTagParam}</strong>
              </span>
              <button
                type="button"
                onClick={handleClearTag}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap"
              >
                Clear Tag Filter
              </button>
            </div>
          )}

          {/* Content States */}
          <div className="mt-10">
            {loading ? (
              <CardSkeleton count={6} />
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
                <p className="text-sm font-medium text-red-900">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchInsights({ pageToLoad: 1, append: false })}
                  className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg"
                >
                  Retry Loading
                </button>
              </div>
            ) : !hasResults ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
                <h2 className="font-display text-lg font-bold text-slate-950">
                  No matching published articles
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Try clearing your search term or selecting a different category. Drafts and unapproved BrandOS submissions are never shown publicly.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-5 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-12">
                {/* Featured Article Spotlight */}
                {featuredArticle && (
                  <article className="rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                    <Link
                      to={`/insights/${featuredArticle.slug}`}
                      className="lg:col-span-6 min-h-[260px] overflow-hidden"
                    >
                      <MediaFrame
                        src={featuredArticle.coverImage}
                        alt={featuredArticle.title}
                        fallbackTitle={featuredArticle.category}
                        className="w-full h-full"
                      />
                    </Link>
                    <div className="lg:col-span-6 p-7 sm:p-10 flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
                          <span className="font-semibold text-blue-700">Featured Article</span>
                          <span aria-hidden="true">·</span>
                          <span>{featuredArticle.category}</span>
                          <span aria-hidden="true">·</span>
                          <time dateTime={featuredArticle.publishedAt}>
                            {formatInsightDate(featuredArticle.publishedAt)}
                          </time>
                          <span aria-hidden="true">·</span>
                          <span>{featuredArticle.readingTime || featuredArticle.readTime}</span>
                        </div>
                        <Link to={`/insights/${featuredArticle.slug}`}>
                          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight hover:text-blue-700 transition-colors">
                            {featuredArticle.title}
                          </h2>
                        </Link>
                        <p className="mt-4 text-base text-slate-600 leading-relaxed">
                          {featuredArticle.excerpt || featuredArticle.summary}
                        </p>
                      </div>

                      <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-between gap-4">
                        <span className="text-xs text-slate-500">
                          {featuredArticle.authorName} · {featuredArticle.department}
                        </span>
                        <Link
                          to={`/insights/${featuredArticle.slug}`}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap"
                        >
                          <span>Read Article</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </article>
                )}

                {/* Articles Grid */}
                {articles.length > 0 && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {articles.map((article) => (
                        <BlogCard key={article.id} article={article} />
                      ))}
                    </div>

                    {/* Pagination / Load More Controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
                      <p className="text-xs font-mono text-slate-500 tabular-nums">
                        Showing {articles.length} of {total} {total === 1 ? 'article' : 'articles'}
                        {featuredArticle ? ' (plus featured spotlight)' : ''}
                      </p>
                      {hasMore && (
                        <button
                          type="button"
                          disabled={loadingMore}
                          onClick={() => fetchInsights({ pageToLoad: page + 1, append: true })}
                          className="px-5 py-2.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-700 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
                        >
                          {loadingMore ? 'Loading more articles...' : 'Load More Articles'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
