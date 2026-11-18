import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  FilePlus2,
  Globe,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { apiClient, extractApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ArticlePreviewModal from '../components/ArticlePreviewModal.jsx';
import { PageLoadingState } from '../components/LoadingSkeleton.jsx';

function formatShortDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

function StatusCell({ article }) {
  const map = {
    published: 'text-emerald-700',
    approved: 'text-emerald-700',
    under_review: 'text-blue-700',
    changes_requested: 'text-amber-800',
    rejected: 'text-red-700',
    draft: 'text-slate-700',
    unpublished: 'text-slate-500',
  };
  const labelMap = {
    published: 'Published',
    approved: 'Approved (Ready)',
    under_review: 'Under Review',
    changes_requested: 'Changes Requested',
    rejected: 'Rejected',
    draft: 'Draft',
    unpublished: 'Unpublished',
  };

  return (
    <div className="space-y-0.5">
      <div className={`text-xs font-semibold ${map[article.status] || 'text-slate-700'}`}>
        {labelMap[article.status] || article.status}
      </div>
      <div className="text-[11px] text-slate-500">
        {article.requiredClaimsVerified ? 'Claims Verified' : 'Claims Unverified'} ·{' '}
        {article.approvalStatus === 'approved' ? 'Approved' : article.approvalStatus}
      </div>
    </div>
  );
}

export default function BlogManagePage() {
  const { user, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [articles, setArticles] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draftsAndReview: 0,
    unpublished: 0,
  });
  const [permissions, setPermissions] = useState({
    canCreate: true,
    canEdit: true,
    canVerifyClaims: false,
    canApprove: false,
    canPublish: false,
    canDelete: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewArticle, setPreviewArticle] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  const loadManagedArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/blog/manage');
      setArticles(Array.isArray(data.articles) ? data.articles : []);
      if (data.stats) setStats(data.stats);
      if (data.permissions) setPermissions(data.permissions);
    } catch (err) {
      setError(extractApiError(err, 'Unable to load Blog Management workspace.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadManagedArticles();
  }, [loadManagedArticles]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter((art) => {
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'published'
            ? art.isPublic
            : statusFilter === 'review'
              ? ['draft', 'under_review', 'changes_requested', 'approved', 'rejected'].includes(
                  art.status
                ) && !art.isPublic
              : art.status === 'unpublished';

      const tagText = Array.isArray(art.tags) ? art.tags.join(' ').toLowerCase() : '';
      const matchesSearch =
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.category.toLowerCase().includes(q) ||
        art.authorName.toLowerCase().includes(q) ||
        (art.brandosSubmissionId || '').toLowerCase().includes(q) ||
        tagText.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [articles, statusFilter, searchQuery]);

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    setActionBusy(true);
    try {
      const { type, article } = confirmAction;
      if (type === 'unpublish') {
        await apiClient.post(`/blog/manage/${article.id}/workflow`, { action: 'unpublish' });
        addToast(`Unpublished "${article.title}" from public Insights.`, 'info');
      } else if (type === 'publish') {
        await apiClient.post(`/blog/manage/${article.id}/workflow`, { action: 'publish' });
        addToast(`Published "${article.title}" to public Insights.`, 'success');
      } else if (type === 'delete') {
        await apiClient.delete(`/blog/manage/${article.id}`);
        addToast(`Permanently deleted "${article.title}".`, 'success');
      }
      setConfirmAction(null);
      await loadManagedArticles();
    } catch (err) {
      addToast(extractApiError(err, 'Action could not be completed.'), 'error');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return <PageLoadingState label="Loading Blog Management workspace..." />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-12rem)] py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>BrandOS Governed Publishing</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950">
              Blog Management
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Signed in as <strong className="font-semibold text-slate-900">{user?.name}</strong> (
              {user?.department || 'Staff'} · {user?.brandosRole || 'Creator'}). Only BrandOS-approved,
              claim-verified articles can be published publicly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/insights"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold whitespace-nowrap"
            >
              <Globe className="w-4 h-4 text-slate-500" />
              <span>Public Insights</span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold whitespace-nowrap"
              >
                <span>Admin Console</span>
              </Link>
            )}
            <Link
              to="/admin/blog/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold whitespace-nowrap"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>New Article Draft</span>
            </Link>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Published Live</p>
            <p className="mt-2 font-display text-3xl font-bold text-emerald-700 tabular-nums">
              {stats.published}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Drafts &amp; In Review</p>
            <p className="mt-2 font-display text-3xl font-bold text-blue-700 tabular-nums">
              {stats.draftsAndReview}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Unpublished / Archived</p>
            <p className="mt-2 font-display text-3xl font-bold text-slate-700 tabular-nums">
              {stats.unpublished}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Total Articles</p>
            <p className="mt-2 font-display text-3xl font-bold text-slate-950 tabular-nums">
              {stats.total}
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg w-fit">
            {[
              { id: 'all', label: `All (${articles.length})` },
              { id: 'published', label: 'Published' },
              { id: 'review', label: 'Draft & Review' },
              { id: 'unpublished', label: 'Unpublished' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <label htmlFor="manage-blog-search" className="sr-only">
              Search managed articles
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="manage-blog-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, author, ID, tags..."
              className="w-full pl-10 pr-9 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-700"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Articles Table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {filteredArticles.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-sm font-medium text-slate-700">
                No articles match the selected filter or search query.
              </p>
              <Link
                to="/admin/blog/new"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>Create a New Draft</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <th className="py-3 px-4 font-semibold">Article &amp; Category</th>
                    <th className="py-3 px-3 font-semibold">Author</th>
                    <th className="py-3 px-3 font-semibold">BrandOS Status</th>
                    <th className="py-3 px-3 font-semibold">Dates</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredArticles.map((art) => (
                    <tr key={art.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <div className="flex items-center gap-3">
                          <img
                            src={art.coverImage}
                            alt=""
                            className="w-12 h-9 rounded-md object-cover border border-slate-200 shrink-0 bg-slate-100"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-950 truncate" title={art.title}>
                              {art.title}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              <span className="font-medium text-blue-700">{art.category}</span>
                              <span aria-hidden="true"> · </span>
                              <span className="font-mono">{art.brandosSubmissionId}</span>
                              {art.featured ? ' · Featured' : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-700 max-w-[160px]">
                        <div className="font-medium text-slate-900 truncate" title={art.authorName}>
                          {art.authorName}
                        </div>
                        <div className="text-slate-500 truncate">{art.department}</div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <StatusCell article={art} />
                      </td>
                      <td className="py-3.5 px-3 text-[11px] font-mono text-slate-500 tabular-nums whitespace-nowrap">
                        <div>
                          {art.isPublic ? `Pub: ${formatShortDate(art.publishedAt)}` : 'Not Public'}
                        </div>
                        <div className="text-slate-400">
                          Upd: {formatShortDate(art.updatedAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {art.isPublic && (
                            <a
                              href={`/insights/${art.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`View ${art.title} on public Insights`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-700 rounded-md"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setPreviewArticle(art)}
                            aria-label={`Preview ${art.title}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-700 rounded-md"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>

                          <Link
                            to={`/admin/blog/edit/${art.id}`}
                            aria-label={`Edit ${art.title}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </Link>

                          {permissions.canPublish && art.isPublic && (
                            <button
                              type="button"
                              aria-label={`Unpublish ${art.title}`}
                              onClick={() =>
                                setConfirmAction({ type: 'unpublish', article: art })
                              }
                              className="px-2 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md"
                            >
                              Unpublish
                            </button>
                          )}

                          {permissions.canPublish &&
                            !art.isPublic &&
                            art.approvalStatus === 'approved' &&
                            art.requiredClaimsVerified && (
                              <button
                                type="button"
                                aria-label={`Publish ${art.title}`}
                                onClick={() =>
                                  setConfirmAction({ type: 'publish', article: art })
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{art.status === 'unpublished' ? 'Republish' : 'Publish'}</span>
                              </button>
                            )}

                          {permissions.canDelete && (
                            <button
                              type="button"
                              aria-label={`Delete ${art.title}`}
                              onClick={() => setConfirmAction({ type: 'delete', article: art })}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ArticlePreviewModal
        open={Boolean(previewArticle)}
        article={previewArticle}
        onClose={() => setPreviewArticle(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'delete'
            ? 'Permanently Delete Article?'
            : confirmAction?.type === 'unpublish'
              ? 'Unpublish Public Article?'
              : 'Publish Approved Article?'
        }
        description={
          confirmAction?.type === 'delete'
            ? `Deleting "${confirmAction?.article?.title}" will permanently remove it from NovaTech and BrandOS records. This action cannot be undone.`
            : confirmAction?.type === 'unpublish'
              ? `Unpublishing "${confirmAction?.article?.title}" immediately hides it from NovaTech Insights and its public URL while preserving the draft for future updates.`
              : `Publishing "${confirmAction?.article?.title}" makes this BrandOS-verified article live on NovaTech Insights.`
        }
        confirmLabel={
          confirmAction?.type === 'delete'
            ? 'Delete Permanently'
            : confirmAction?.type === 'unpublish'
              ? 'Unpublish Article'
              : 'Publish Article'
        }
        variant={
          confirmAction?.type === 'delete' || confirmAction?.type === 'unpublish'
            ? 'danger'
            : 'primary'
        }
        busy={actionBusy}
        onConfirm={executeConfirmedAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
