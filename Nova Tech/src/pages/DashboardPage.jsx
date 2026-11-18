import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ExternalLink,
  FileText,
  Mail,
  Plus,
  Save,
  Shield,
  UserCheck,
} from 'lucide-react';
import { apiClient, extractApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
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

function StatusLabel({ status }) {
  const map = {
    published: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    approved: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    under_review: 'text-blue-700 bg-blue-50 border-blue-200',
    changes_requested: 'text-amber-800 bg-amber-50 border-amber-200',
    draft: 'text-slate-700 bg-slate-100 border-slate-200',
    unpublished: 'text-slate-600 bg-slate-100 border-slate-200',
    Received: 'text-blue-700 bg-blue-50 border-blue-200',
    'In Review': 'text-emerald-700 bg-emerald-50 border-emerald-200',
  };
  const cls = map[status] || 'text-slate-700 bg-slate-100 border-slate-200';
  const label = String(status || 'unknown').replace(/_/g, ' ');
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border capitalize ${cls}`}>
      {label}
    </span>
  );
}

function CustomerDashboard({ user, updateLocalUser }) {
  const { addToast } = useToast();
  const [enquiries, setEnquiries] = useState([]);
  const [loadingEnquiries, setLoadingEnquiries] = useState(true);
  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    company: user.company || '',
    productUpdates: Boolean(user.notificationPreferences?.productUpdates ?? true),
    enquiryReplies: Boolean(user.notificationPreferences?.enquiryReplies ?? true),
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    apiClient
      .get('/customer/enquiries')
      .then(({ data }) => {
        setEnquiries(Array.isArray(data.enquiries) ? data.enquiries : []);
      })
      .catch(() => {
        setEnquiries([]);
      })
      .finally(() => setLoadingEnquiries(false));
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (profileForm.name.trim().length < 2) {
      addToast('Name must be at least 2 characters.', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      const { data } = await apiClient.patch('/customer/profile', {
        name: profileForm.name.trim(),
        company: profileForm.company.trim(),
        notificationPreferences: {
          productUpdates: profileForm.productUpdates,
          enquiryReplies: profileForm.enquiryReplies,
        },
      });
      updateLocalUser(data.user);
      addToast('Account settings saved.', 'success');
    } catch (err) {
      addToast(extractApiError(err, 'Could not update profile settings.'), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-12rem)] py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <p className="text-xs font-semibold text-blue-700 mb-1">Customer Account Portal</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950">
              Welcome, {user.name}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {user.company || 'Client Account'} · {user.email}
            </p>
          </div>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold whitespace-nowrap self-start sm:self-auto"
          >
            <Mail className="w-4 h-4" />
            <span>Submit New Enquiry</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Profile & Account Settings */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleSaveProfile}
              className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
            >
              <h2 className="font-display text-lg font-bold text-slate-950">
                Profile &amp; Account Settings
              </h2>

              <div>
                <label
                  htmlFor="cust-name"
                  className="block text-sm font-medium text-slate-800 mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="cust-name"
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                />
              </div>

              <div>
                <label
                  htmlFor="cust-company"
                  className="block text-sm font-medium text-slate-800 mb-1.5"
                >
                  Company / Organization
                </label>
                <input
                  id="cust-company"
                  type="text"
                  value={profileForm.company}
                  onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                />
              </div>

              <div className="pt-2 space-y-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500">Communication Preferences</p>
                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.enquiryReplies}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, enquiryReplies: e.target.checked })
                    }
                    className="rounded border-slate-300 text-blue-700"
                  />
                  <span>Notify me when solutions leads reply to enquiries</span>
                </label>
                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.productUpdates}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, productUpdates: e.target.checked })
                    }
                    className="rounded border-slate-300 text-blue-700"
                  />
                  <span>Receive published NovaTech engineering insights</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                <span>{savingProfile ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </form>
          </div>

          {/* Enquiry History */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-4 mb-5">
                <h2 className="font-display text-lg font-bold text-slate-950">
                  Enquiry History
                </h2>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {enquiries.length} {enquiries.length === 1 ? 'record' : 'records'}
                </span>
              </div>

              {loadingEnquiries ? (
                <p className="text-sm text-slate-500 py-6">Loading enquiry history...</p>
              ) : enquiries.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="text-sm text-slate-600">
                    You have not submitted any enquiries yet.
                  </p>
                  <Link
                    to="/contact"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900"
                  >
                    <span>Send an Enquiry</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {enquiries.map((enq) => (
                    <div key={enq.id} className="py-4 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-950">{enq.subject}</h3>
                        <StatusLabel status={enq.status} />
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{enq.message}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 font-mono tabular-nums pt-1">
                        <span>{enq.id}</span>
                        <span>·</span>
                        <span>{formatShortDate(enq.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeeDashboard({ user, isAdmin, launchBrandos }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient
      .get('/employee/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(extractApiError(err, 'Unable to load employee dashboard.')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageLoadingState label="Loading employee workspace..." />;
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {error || 'Employee workspace unavailable.'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-12rem)] py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Employee Identity & BrandOS Launch Bar */}
        <div className="rounded-2xl bg-slate-950 text-white p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold text-blue-400 mb-2">
              Employee Workspace · BrandOS Integration Gateway
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              {user.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-400" />
                <span>Department: {user.department || 'Unassigned'}</span>
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>BrandOS Role: {user.brandosRole || 'Creator'}</span>
              {user.jobTitle && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>{user.jobTitle}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/admin/blog"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Blog Management</span>
            </Link>
            <button
              type="button"
              onClick={() => launchBrandos('/dashboard')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <span>Open BrandOS</span>
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => launchBrandos('/submissions/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>New Submission</span>
            </button>
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Console</span>
              </Link>
            )}
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Department Submissions</p>
            <p className="mt-2 font-display text-3xl font-bold text-slate-950 tabular-nums">
              {data.stats.totalSubmissions}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">
              {data.canReviewApprovals ? 'Pending Approvals' : 'Review Queue'}
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-blue-700 tabular-nums">
              {data.canReviewApprovals ? data.stats.pendingApprovals : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Approved &amp; Published</p>
            <p className="mt-2 font-display text-3xl font-bold text-emerald-700 tabular-nums">
              {data.stats.approvedContent}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Changes Requested</p>
            <p className="mt-2 font-display text-3xl font-bold text-amber-700 tabular-nums">
              {data.stats.changesRequested}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Recent Department Submissions */}
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-950">
                  Recent Submissions ({user.department})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Content drafting, Claim Ledger checks, and approvals happen inside BrandOS.
                </p>
              </div>
              <button
                type="button"
                onClick={() => launchBrandos('/submissions')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap"
              >
                Manage in BrandOS
              </button>
            </div>

            {data.recentSubmissions.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                No synced submissions found for {user.department}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2.5 pr-4 font-semibold">Submission</th>
                      <th className="py-2.5 pr-4 font-semibold">ID</th>
                      <th className="py-2.5 pr-4 font-semibold">Status</th>
                      <th className="py-2.5 font-semibold text-right">Published</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {data.recentSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/70">
                        <td className="py-3 pr-4">
                          <Link
                            to={`/admin/blog/edit/${sub.id}`}
                            className="font-medium text-slate-950 hover:text-blue-700 transition-colors"
                          >
                            {sub.title}
                          </Link>
                          <div className="text-xs text-slate-500">
                            {sub.authorName} · {sub.department}
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {sub.brandosSubmissionId}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <StatusLabel status={sub.status} />
                        </td>
                        <td className="py-3 text-right text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
                          {sub.status === 'published' && sub.slug ? (
                            <Link
                              to={`/insights/${sub.slug}`}
                              className="text-blue-700 hover:underline"
                            >
                              {formatShortDate(sub.publishedAt)}
                            </Link>
                          ) : (
                            'Internal Only'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pending Approvals & Recent Activity */}
          <div className="lg:col-span-4 space-y-6">
            {data.canReviewApprovals && (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="font-display text-base font-bold text-slate-950 mb-4">
                  Pending Approvals ({user.brandosRole})
                </h2>
                {data.pendingApprovals.length === 0 ? (
                  <p className="text-sm text-slate-500">No pending items awaiting review.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.pendingApprovals.map((item) => (
                      <li
                        key={item.id}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-slate-500">
                            {item.brandosSubmissionId}
                          </span>
                          <StatusLabel status={item.status} />
                        </div>
                        <p className="text-sm font-medium text-slate-900 leading-snug">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.authorName} · {item.department}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-blue-700" />
                <h2 className="font-display text-base font-bold text-slate-950">
                  Recent Publication Activity
                </h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {data.recentActivity.map((act) => (
                  <li key={act.id} className="py-3 first:pt-0 last:pb-0 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{act.action}</span>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {formatShortDate(act.timestamp)}
                      </span>
                    </div>
                    <p className="text-slate-600 line-clamp-1">{act.articleTitle}</p>
                    <p className="text-slate-400">
                      {act.actorName} · {act.brandosSubmissionId}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isEmployee, isAdmin, updateLocalUser, launchBrandos } = useAuth();

  if (!user) return null;

  if (isEmployee) {
    return (
      <EmployeeDashboard
        user={user}
        isAdmin={isAdmin}
        launchBrandos={launchBrandos}
      />
    );
  }

  return <CustomerDashboard user={user} updateLocalUser={updateLocalUser} />;
}
