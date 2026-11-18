import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { apiClient, extractApiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
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

export default function AdminPage() {
  const { addToast } = useToast();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [savingUserId, setSavingUserId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/admin/overview');
      setOverview(data);
    } catch (err) {
      setError(extractApiError(err, 'Unable to load administration console.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleUpdateUser = async (userId, updates) => {
    setSavingUserId(userId);
    try {
      await apiClient.patch(`/admin/users/${userId}`, updates);
      addToast('Account permissions updated.', 'success');
      await loadOverview();
    } catch (err) {
      addToast(extractApiError(err, 'Failed to update user account.'), 'error');
    } finally {
      setSavingUserId(null);
    }
  };

  const executeContentAction = async () => {
    if (!confirmAction) return;
    setActionBusy(true);
    try {
      if (confirmAction.type === 'unpublish') {
        await apiClient.post(`/admin/insights/${confirmAction.record.id}/unpublish`);
        addToast(`Unpublished "${confirmAction.record.title}".`, 'info');
      } else if (confirmAction.type === 'publish') {
        await apiClient.post(`/admin/insights/${confirmAction.record.id}/publish`);
        addToast(`Published "${confirmAction.record.title}" to public Insights.`, 'success');
      }
      setConfirmAction(null);
      await loadOverview();
    } catch (err) {
      addToast(extractApiError(err, 'Publication governance action rejected.'), 'error');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return <PageLoadingState label="Loading administration console..." />;
  }

  if (error || !overview) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {error || 'Administration data unavailable.'}
        </div>
      </div>
    );
  }

  const { users, contentRecords, publicationHistory, enquiries, metadata } = overview;

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-12rem)] py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 mb-1">
              <Shield className="w-4 h-4" />
              <span>Site Administration Console</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950">
              Account &amp; Publication Governance
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage employee departments, BrandOS role assignments, and public Insights publication status.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <Link
              to="/admin/blog"
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold whitespace-nowrap"
            >
              Blog Management
            </Link>
            <Link
              to="/dashboard"
              className="text-sm font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg w-fit">
          {[
            { id: 'users', label: `Users & Roles (${users.length})` },
            { id: 'content', label: `Published & BrandOS Records (${contentRecords.length})` },
            { id: 'history', label: `Publication History (${publicationHistory.length})` },
            { id: 'enquiries', label: `Enquiries (${enquiries.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Users & Role Governance */}
        {activeTab === 'users' && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <th className="py-3 px-4 font-semibold">User</th>
                    <th className="py-3 px-4 font-semibold">Website Access</th>
                    <th className="py-3 px-4 font-semibold">Department</th>
                    <th className="py-3 px-4 font-semibold">BrandOS Role</th>
                    <th className="py-3 px-4 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {users.map((u) => {
                    const isCustomer = u.websiteRole === 'customer';
                    const isSaving = savingUserId === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-950">{u.name}</div>
                          <div className="font-mono text-xs text-slate-500">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            aria-label={`Website role for ${u.name}`}
                            disabled={isSaving}
                            value={u.websiteRole}
                            onChange={(e) =>
                              handleUpdateUser(u.id, { websiteRole: e.target.value })
                            }
                            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-900"
                          >
                            <option value="customer">Customer</option>
                            <option value="employee">Employee</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4">
                          {isCustomer ? (
                            <span className="text-xs text-slate-400">N/A (Customer)</span>
                          ) : (
                            <select
                              aria-label={`Department for ${u.name}`}
                              disabled={isSaving}
                              value={u.department || 'Marketing'}
                              onChange={(e) =>
                                handleUpdateUser(u.id, { department: e.target.value })
                              }
                              className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-900"
                            >
                              {metadata.departments.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isCustomer ? (
                            <span className="text-xs text-slate-400">No BrandOS Access</span>
                          ) : (
                            <select
                              aria-label={`BrandOS role for ${u.name}`}
                              disabled={isSaving}
                              value={u.brandosRole || 'Creator'}
                              onChange={(e) =>
                                handleUpdateUser(u.id, { brandosRole: e.target.value })
                              }
                              className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-900"
                            >
                              {metadata.brandosRoles.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              handleUpdateUser(u.id, { isActive: !u.isActive })
                            }
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                              u.isActive
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                : 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            {u.isActive ? 'Active' : 'Suspended'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Content & Publication Governance */}
        {activeTab === 'content' && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
              <span>
                Only records with verified BrandOS approval (<span className="font-mono">approvalStatus === &apos;approved&apos;</span> and <span className="font-mono">requiredClaimsVerified === true</span>) can appear on the public Insights page.
              </span>
              <Link
                to="/admin/blog"
                className="font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0"
              >
                Open Full Blog Editor
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <th className="py-3 px-4 font-semibold">Article / Submission</th>
                    <th className="py-3 px-4 font-semibold">BrandOS ID</th>
                    <th className="py-3 px-4 font-semibold">Workflow Status</th>
                    <th className="py-3 px-4 font-semibold">Public Visibility</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {contentRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-950">{rec.title}</div>
                        <div className="text-xs text-slate-500">
                          {rec.department} · {rec.authorName}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 tabular-nums">
                        {rec.brandosSubmissionId || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs capitalize text-slate-700">
                        {rec.status.replace(/_/g, ' ')} ({rec.approvalStatus})
                      </td>
                      <td className="py-3.5 px-4">
                        {rec.isPublic ? (
                          <Link
                            to={`/insights/${rec.slug}`}
                            className="text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            Publicly Visible
                          </Link>
                        ) : (
                          <span className="text-xs font-medium text-slate-500">
                            Hidden from Public
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {rec.isPublic ? (
                          <button
                            type="button"
                            aria-label={`Unpublish ${rec.title}`}
                            onClick={() =>
                              setConfirmAction({ type: 'unpublish', record: rec })
                            }
                            className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md"
                          >
                            Unpublish
                          </button>
                        ) : rec.approvalStatus === 'approved' && rec.requiredClaimsVerified ? (
                          <button
                            type="button"
                            aria-label={`Republish ${rec.title}`}
                            onClick={() =>
                              setConfirmAction({ type: 'publish', record: rec })
                            }
                            className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md"
                          >
                            Republish
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Awaiting BrandOS Approval
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Publication History */}
        {activeTab === 'history' && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <th className="py-3 px-4 font-semibold">Action</th>
                    <th className="py-3 px-4 font-semibold">Article</th>
                    <th className="py-3 px-4 font-semibold">Submission ID</th>
                    <th className="py-3 px-4 font-semibold">Actor</th>
                    <th className="py-3 px-4 font-semibold text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {publicationHistory.map((h) => (
                    <tr key={h.id}>
                      <td className="py-3 px-4 font-semibold text-slate-900">{h.action}</td>
                      <td className="py-3 px-4 text-slate-700">{h.articleTitle}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums">
                        {h.brandosSubmissionId}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {h.actorName} ({h.department})
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-500 tabular-nums">
                        {formatShortDate(h.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Customer Enquiries */}
        {activeTab === 'enquiries' && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <th className="py-3 px-4 font-semibold">Contact</th>
                    <th className="py-3 px-4 font-semibold">Subject &amp; Message</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {enquiries.map((e) => (
                    <tr key={e.id}>
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-slate-950">{e.name}</div>
                        <div className="text-xs text-slate-500">{e.email}</div>
                        <div className="text-xs text-slate-400">{e.company}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-medium text-slate-900">{e.subject}</div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{e.message}</p>
                      </td>
                      <td className="py-3.5 px-4 align-top text-xs font-medium text-blue-700">
                        {e.status}
                      </td>
                      <td className="py-3.5 px-4 align-top text-right font-mono text-xs text-slate-500 tabular-nums">
                        {formatShortDate(e.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === 'unpublish'
            ? 'Unpublish Public Article?'
            : 'Publish Approved Article?'
        }
        description={
          confirmAction?.type === 'unpublish'
            ? `Removing "${confirmAction?.record?.title}" will immediately hide it from NovaTech's public Insights page while preserving its BrandOS submission history.`
            : `Republishing "${confirmAction?.record?.title}" will restore it to NovaTech's public Insights feed.`
        }
        confirmLabel={confirmAction?.type === 'unpublish' ? 'Unpublish Article' : 'Publish Article'}
        variant={confirmAction?.type === 'unpublish' ? 'danger' : 'primary'}
        busy={actionBusy}
        onConfirm={executeContentAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
