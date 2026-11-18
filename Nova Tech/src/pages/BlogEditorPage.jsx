import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Eye,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { apiClient, extractApiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import ArticlePreviewModal from '../components/ArticlePreviewModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { PageLoadingState } from '../components/LoadingSkeleton.jsx';

function clientSlugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function estimateReadingTime(text) {
  const words = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return { words, label: `${mins} min read` };
}

export default function BlogEditorPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [articleRecord, setArticleRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState([
    'AI & Automation',
    'Software Architecture',
    'Product Design',
    'Cloud Systems',
    'Digital Strategy',
    'Brand Governance',
  ]);
  const [coverLibrary, setCoverLibrary] = useState([]);
  const [permissions, setPermissions] = useState({
    canCreate: true,
    canEdit: true,
    canVerifyClaims: false,
    canApprove: false,
    canPublish: false,
    canFeature: false,
    canDelete: false,
  });

  const [slugLocked, setSlugLocked] = useState(isEditing);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: 'AI & Automation',
    tagsText: '',
    coverImage: '/src/assets/images/insight_ai_workflows_1794980382417.jpg',
    seoTitle: '',
    seoDescription: '',
    featured: false,
    reviewNotes: '',
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadEditorData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isEditing) {
        const { data } = await apiClient.get(`/blog/manage/${id}`);
        const art = data.article;
        setArticleRecord(art);
        setHistory(Array.isArray(data.history) ? data.history : []);
        if (Array.isArray(data.categories)) setCategories(data.categories);
        if (Array.isArray(data.coverLibrary)) setCoverLibrary(data.coverLibrary);
        if (data.permissions) setPermissions(data.permissions);
        setForm({
          title: art.title || '',
          slug: art.slug || '',
          excerpt: art.excerpt || art.summary || '',
          content: art.content || '',
          category: art.category || 'AI & Automation',
          tagsText: Array.isArray(art.tags) ? art.tags.join(', ') : '',
          coverImage:
            art.coverImage || '/src/assets/images/insight_ai_workflows_1794980382417.jpg',
          seoTitle: art.seoTitle || '',
          seoDescription: art.seoDescription || '',
          featured: Boolean(art.featured ?? art.isFeatured),
          reviewNotes: art.reviewNotes || '',
        });
        setSlugLocked(true);
      } else {
        const { data } = await apiClient.get('/blog/manage');
        if (Array.isArray(data.categories)) setCategories(data.categories);
        if (Array.isArray(data.coverLibrary)) setCoverLibrary(data.coverLibrary);
        if (data.permissions) setPermissions(data.permissions);
      }
    } catch (err) {
      setError(extractApiError(err, 'Unable to load article editor.'));
    } finally {
      setLoading(false);
    }
  }, [id, isEditing]);

  useEffect(() => {
    loadEditorData();
  }, [loadEditorData]);

  const handleTitleChange = (val) => {
    setForm((prev) => ({
      ...prev,
      title: val,
      slug: !slugLocked ? clientSlugify(val) : prev.slug,
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file (PNG, JPG, WebP).', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      addToast('Image file must be smaller than 2MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, coverImage: reader.result }));
        addToast('Cover image loaded into draft.', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const buildPayload = () => ({
    title: form.title.trim(),
    slug: form.slug.trim(),
    excerpt: form.excerpt.trim(),
    content: form.content.trim(),
    category: form.category,
    tags: form.tagsText,
    coverImage: form.coverImage.trim(),
    seoTitle: form.seoTitle.trim(),
    seoDescription: form.seoDescription.trim(),
    featured: form.featured,
    reviewNotes: form.reviewNotes.trim(),
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      const payload = buildPayload();
      if (isEditing) {
        const { data } = await apiClient.patch(`/blog/manage/${id}`, payload);
        setArticleRecord(data.article);
        if (data.requiresReapproval) {
          addToast(
            'Substantive edit saved. Article moved back to Under Review for BrandOS re-approval.',
            'info'
          );
        } else {
          addToast('Article changes saved.', 'success');
        }
        await loadEditorData();
      } else {
        const { data } = await apiClient.post('/blog/manage', payload);
        addToast('New BrandOS draft created.', 'success');
        navigate(`/admin/blog/edit/${data.article.id}`, { replace: true });
      }
    } catch (err) {
      const respErrors = err?.response?.data?.fieldErrors;
      if (respErrors && typeof respErrors === 'object') {
        setFieldErrors(respErrors);
      }
      addToast(extractApiError(err, 'Could not save article draft.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleWorkflowAction = async (action) => {
    if (!isEditing) return;
    setWorkflowBusy(true);
    try {
      const { data } = await apiClient.post(`/blog/manage/${id}/workflow`, {
        action,
        reviewNotes: form.reviewNotes.trim(),
      });
      setArticleRecord(data.article);
      const messages = {
        submit_review: 'Submitted draft to BrandOS Review Queue.',
        verify_claims: 'Claim Ledger verification recorded.',
        request_changes: 'Returned submission with revision notes.',
        reject: 'Submission marked as rejected.',
        approve: 'BrandOS Manager approval granted.',
        publish: 'Article published to NovaTech Insights.',
        unpublish: 'Article unpublished from public Insights.',
      };
      addToast(messages[action] || 'Workflow state updated.', 'success');
      await loadEditorData();
    } catch (err) {
      addToast(extractApiError(err, 'Workflow transition rejected.'), 'error');
    } finally {
      setWorkflowBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing) return;
    setWorkflowBusy(true);
    try {
      await apiClient.delete(`/blog/manage/${id}`);
      addToast(`Deleted "${articleRecord?.title || 'article'}" permanently.`, 'success');
      navigate('/admin/blog', { replace: true });
    } catch (err) {
      addToast(extractApiError(err, 'Failed to delete article.'), 'error');
    } finally {
      setWorkflowBusy(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return <PageLoadingState label="Loading article editor..." />;
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {error}
        </div>
        <Link
          to="/admin/blog"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Blog Management</span>
        </Link>
      </div>
    );
  }

  const statsRead = estimateReadingTime(form.content);
  const previewModel = {
    ...(articleRecord || {}),
    title: form.title,
    slug: form.slug,
    excerpt: form.excerpt,
    content: form.content,
    category: form.category,
    tags: form.tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    coverImage: form.coverImage,
    readingTime: statsRead.label,
    status: articleRecord?.status || 'draft',
    isPublic: Boolean(articleRecord?.isPublic),
  };

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-12rem)] py-10 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <Link
              to="/admin/blog"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Blog Management</span>
            </Link>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950">
              {isEditing ? 'Edit Insights Article' : 'Create New Article Draft'}
            </h1>
            {articleRecord && (
              <p className="text-xs font-mono text-slate-500 mt-1">
                {articleRecord.brandosSubmissionId} · Current status:{' '}
                {String(articleRecord.status || 'draft').replace(/_/g, ' ')}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
            {articleRecord?.isPublic && (
              <a
                href={`/insights/${articleRecord.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-sm font-semibold"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View Live</span>
              </a>
            )}
          </div>
        </div>

        {articleRecord?.status === 'published' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-sm text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">BrandOS Re-Approval Notice:</strong> Saving
              substantive edits to a published article automatically moves it back to{' '}
              <span className="font-mono text-xs">under_review</span> so Claim Ledger checks and
              Manager approval are re-verified before going live again.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Editorial Form */}
          <form
            onSubmit={handleSave}
            className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6"
          >
            <div>
              <label
                htmlFor="editor-title"
                className="block text-sm font-semibold text-slate-900 mb-1.5"
              >
                Article Title
              </label>
              <input
                id="editor-title"
                type="text"
                required
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g., How Deterministic AI Pipelines Transform Enterprise Operations"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
              />
              {fieldErrors.title && (
                <p className="mt-1 text-xs text-red-700">{fieldErrors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="editor-slug" className="text-sm font-semibold text-slate-900">
                    URL Slug
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSlugLocked(false);
                      setForm((prev) => ({ ...prev, slug: clientSlugify(prev.title) }));
                    }}
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    Generate from Title
                  </button>
                </div>
                <input
                  id="editor-slug"
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => {
                    setSlugLocked(true);
                    setForm((prev) => ({ ...prev, slug: clientSlugify(e.target.value) }));
                  }}
                  placeholder="article-url-slug"
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                />
                <p className="mt-1 text-xs text-slate-500 font-mono truncate">
                  /insights/{form.slug || '...'}
                </p>
                {fieldErrors.slug && (
                  <p className="mt-1 text-xs text-red-700">{fieldErrors.slug}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="editor-category"
                  className="block text-sm font-semibold text-slate-900 mb-1.5"
                >
                  Category
                </label>
                <select
                  id="editor-category"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-2 focus:outline-blue-700"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {fieldErrors.category && (
                  <p className="mt-1 text-xs text-red-700">{fieldErrors.category}</p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="editor-tags"
                className="block text-sm font-semibold text-slate-900 mb-1.5"
              >
                Tags (comma-separated)
              </label>
              <input
                id="editor-tags"
                type="text"
                value={form.tagsText}
                onChange={(e) => setForm((prev) => ({ ...prev, tagsText: e.target.value }))}
                placeholder="AI, Governance, Architecture, Cloud"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="editor-excerpt"
                className="block text-sm font-semibold text-slate-900 mb-1.5"
              >
                Article Excerpt
              </label>
              <textarea
                id="editor-excerpt"
                rows={2}
                required
                value={form.excerpt}
                onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Concise summary shown on Insights cards and featured spotlight..."
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
              />
              {fieldErrors.excerpt && (
                <p className="mt-1 text-xs text-red-700">{fieldErrors.excerpt}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="editor-content" className="text-sm font-semibold text-slate-900">
                  Article Body Content
                </label>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  {statsRead.words} words · {statsRead.label}
                </span>
              </div>
              <textarea
                id="editor-content"
                rows={12}
                required
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Separate paragraphs with a blank line..."
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 leading-relaxed focus:outline-2 focus:outline-blue-700"
              />
              {fieldErrors.content && (
                <p className="mt-1 text-xs text-red-700">{fieldErrors.content}</p>
              )}
            </div>

            {/* Cover Image Selection */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label htmlFor="editor-cover" className="text-sm font-semibold text-slate-900">
                  Cover Image
                </label>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-blue-400 rounded-md cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Local Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </label>
              </div>

              {coverLibrary.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {coverLibrary.map((preset) => {
                    const selected = form.coverImage === preset.url;
                    return (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, coverImage: preset.url }))}
                        className={`text-left rounded-lg overflow-hidden border transition-all ${
                          selected
                            ? 'border-blue-700 ring-2 ring-blue-700/30'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-full h-14 object-cover"
                        />
                        <div className="px-2 py-1 text-[11px] font-medium text-slate-700 truncate bg-white">
                          {preset.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <input
                id="editor-cover"
                type="text"
                value={form.coverImage}
                onChange={(e) => setForm((prev) => ({ ...prev, coverImage: e.target.value }))}
                placeholder="/src/assets/images/... or https://..."
                className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-slate-300 text-slate-800 focus:outline-2 focus:outline-blue-700"
              />
              {fieldErrors.coverImage && (
                <p className="mt-1 text-xs text-red-700">{fieldErrors.coverImage}</p>
              )}
            </div>

            {/* SEO Metadata */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <h2 className="font-display text-base font-bold text-slate-950">
                SEO &amp; Spotlight Metadata
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label
                    htmlFor="editor-seo-title"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    SEO Title
                  </label>
                  <input
                    id="editor-seo-title"
                    type="text"
                    value={form.seoTitle}
                    onChange={(e) => setForm((prev) => ({ ...prev, seoTitle: e.target.value }))}
                    placeholder="Defaults to article title if omitted"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                  />
                </div>
                <div>
                  <label
                    htmlFor="editor-seo-desc"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    SEO Meta Description
                  </label>
                  <textarea
                    id="editor-seo-desc"
                    rows={2}
                    value={form.seoDescription}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, seoDescription: e.target.value }))
                    }
                    placeholder="Defaults to article excerpt if omitted"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                  />
                </div>
                {permissions.canFeature && (
                  <label className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, featured: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-blue-700"
                    />
                    <span>Feature in Insights spotlight &amp; Home page (when published)</span>
                  </label>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <Link
                to="/admin/blog"
                className="text-sm font-medium text-slate-600 hover:text-slate-950"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                <span>
                  {saving
                    ? 'Saving...'
                    : isEditing
                      ? 'Save Changes'
                      : 'Save as BrandOS Draft'}
                </span>
              </button>
            </div>
          </form>

          {/* Right Rail: BrandOS Governance Workflow */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-700" />
                <h2 className="font-display text-lg font-bold text-slate-950">
                  BrandOS Workflow Gate
                </h2>
              </div>

              {!isEditing ? (
                <p className="text-sm text-slate-600 leading-relaxed">
                  Save this article as a BrandOS draft first. Once saved, it enters the BrandOS
                  review pipeline: Claim Ledger verification, Manager approval, and authorized
                  publication.
                </p>
              ) : (
                <>
                  <ol className="space-y-3 text-xs border-t border-b border-slate-100 py-4">
                    <li className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-700">1. Draft &amp; Submission</span>
                      <span className="font-mono text-slate-950 capitalize">
                        {String(articleRecord?.status || 'draft').replace(/_/g, ' ')}
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-700">2. Claim Ledger Check</span>
                      <span
                        className={`font-semibold ${
                          articleRecord?.requiredClaimsVerified
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {articleRecord?.requiredClaimsVerified ? 'Verified' : 'Pending'}
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-700">3. Manager Approval</span>
                      <span
                        className={`font-semibold capitalize ${
                          articleRecord?.approvalStatus === 'approved'
                            ? 'text-emerald-700'
                            : articleRecord?.approvalStatus === 'rejected'
                              ? 'text-red-700'
                              : 'text-amber-700'
                        }`}
                      >
                        {articleRecord?.approvalStatus || 'pending'}
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-700">4. Public Visibility</span>
                      <span
                        className={`font-semibold ${
                          articleRecord?.isPublic ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {articleRecord?.isPublic ? 'Published Live' : 'Internal Only'}
                      </span>
                    </li>
                  </ol>

                  <div>
                    <label
                      htmlFor="editor-review-notes"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Review / Governance Notes
                    </label>
                    <textarea
                      id="editor-review-notes"
                      rows={2}
                      value={form.reviewNotes}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, reviewNotes: e.target.value }))
                      }
                      placeholder="Optional reviewer feedback or Claim Ledger notes..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                    />
                  </div>

                  <div className="space-y-2.5">
                    {(articleRecord?.status === 'draft' ||
                      articleRecord?.status === 'changes_requested') && (
                      <button
                        type="button"
                        disabled={workflowBusy}
                        onClick={() => handleWorkflowAction('submit_review')}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold disabled:opacity-60"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit for BrandOS Review</span>
                      </button>
                    )}

                    {permissions.canVerifyClaims && !articleRecord?.requiredClaimsVerified && (
                      <button
                        type="button"
                        disabled={workflowBusy}
                        onClick={() => handleWorkflowAction('verify_claims')}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold disabled:opacity-60"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verify Claim Ledger</span>
                      </button>
                    )}

                    {permissions.canApprove &&
                      articleRecord?.requiredClaimsVerified &&
                      articleRecord?.approvalStatus !== 'approved' && (
                        <button
                          type="button"
                          disabled={workflowBusy}
                          onClick={() => handleWorkflowAction('approve')}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-60"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Approve for Publication</span>
                        </button>
                      )}

                    {permissions.canPublish &&
                      !articleRecord?.isPublic &&
                      articleRecord?.approvalStatus === 'approved' &&
                      articleRecord?.requiredClaimsVerified && (
                        <button
                          type="button"
                          disabled={workflowBusy}
                          onClick={() => handleWorkflowAction('publish')}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-60"
                        >
                          <span>
                            {articleRecord?.status === 'unpublished'
                              ? 'Republish to Insights'
                              : 'Publish to Insights'}
                          </span>
                        </button>
                      )}

                    {permissions.canPublish && articleRecord?.isPublic && (
                      <button
                        type="button"
                        disabled={workflowBusy}
                        onClick={() => handleWorkflowAction('unpublish')}
                        className="w-full px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold disabled:opacity-60"
                      >
                        Unpublish from Public Insights
                      </button>
                    )}

                    {permissions.canVerifyClaims && articleRecord?.status !== 'changes_requested' && (
                      <button
                        type="button"
                        disabled={workflowBusy}
                        onClick={() => handleWorkflowAction('request_changes')}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold disabled:opacity-60"
                      >
                        Request Changes
                      </button>
                    )}

                    {permissions.canDelete && (
                      <button
                        type="button"
                        disabled={workflowBusy}
                        onClick={() => setConfirmDelete(true)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold disabled:opacity-60"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Article Permanently</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {isEditing && history.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
                <h3 className="font-display text-sm font-bold text-slate-950">
                  Audit &amp; Publication Log
                </h3>
                <ul className="divide-y divide-slate-100 text-xs">
                  {history.slice(0, 6).map((h) => (
                    <li key={h.id} className="py-2.5 first:pt-0 last:pb-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">{h.action}</span>
                        <span className="font-mono text-slate-400 tabular-nums">
                          {new Date(h.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-500">
                        {h.actorName} · {h.department}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>

      <ArticlePreviewModal
        open={previewOpen}
        article={previewModel}
        onClose={() => setPreviewOpen(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Permanently Delete Article?"
        description={`Deleting "${articleRecord?.title}" will permanently remove it from NovaTech and BrandOS records. This cannot be undone.`}
        confirmLabel="Delete Permanently"
        variant="danger"
        busy={workflowBusy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
