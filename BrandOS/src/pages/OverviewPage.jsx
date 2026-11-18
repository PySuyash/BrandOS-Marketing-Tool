import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FilePlus2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { SubmissionStatusLabel } from '../components/StatusText.jsx';

export function OverviewPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(err?.response?.data?.error || 'Failed to load dashboard.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-6 text-sm text-red-700">
        {error || 'Unable to render dashboard.'}
      </div>
    );
  }

  const kpis = [
    { label: 'Total Submissions', value: data.metrics.totalSubmissions, tone: 'text-slate-900' },
    { label: 'Pending Reviews', value: data.metrics.pendingReviews, tone: 'text-indigo-700' },
    { label: 'Approved Content', value: data.metrics.approvedContent, tone: 'text-emerald-700' },
    { label: 'Requiring Changes', value: data.metrics.changesRequested, tone: 'text-amber-700' },
    { label: 'Unverified Claims', value: data.metrics.unverifiedClaims, tone: 'text-red-700' },
  ];

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Governance Overview
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Live department compliance metrics, unverified claims, and approval queue for{' '}
            <span className="font-medium text-slate-900">
              {user?.departmentName || 'All Departments'}
            </span>
            .
          </p>
        </div>

        {(user?.role === 'Creator' || user?.role === 'Admin') && (
          <Link
            to="/review/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
          >
            <FilePlus2 className="h-4 w-4" />
            <span>New Content Review</span>
          </Link>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-slate-200 rounded-xl p-4"
          >
            <div className="text-xs font-medium text-slate-500">{kpi.label}</div>
            <div className={`mt-2 font-display text-2xl font-bold tabular-nums ${kpi.tone}`}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Department Review Statistics */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Department Review Statistics
          </h2>
          <Link
            to="/knowledge"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
          >
            Inspect Knowledge Bases
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Department</th>
                <th className="px-4 py-3 text-right">Submissions</th>
                <th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3 text-right">Changes Req.</th>
                <th className="px-4 py-3 text-right">Approved</th>
                <th className="px-4 py-3 text-right">Unverified Claims</th>
                <th className="px-6 py-3 text-right">Conflicting Claims</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.departmentStats.map((d) => (
                <tr key={d.departmentId} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {d.departmentName}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {d.totalSubmissions}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-indigo-700">
                    {d.pending}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-700">
                    {d.changesRequested}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                    {d.approved}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-700 font-medium">
                    {d.unverifiedClaims}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-red-700 font-medium">
                    {d.conflictingClaims}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Two-Column Split: Recent Submissions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Recent Submissions
            </h2>
            <Link
              to="/submissions"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {data.recentSubmissions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No submissions yet in this scope.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentSubmissions.map((s) => (
                <Link
                  key={s.id}
                  to={`/submissions/${s.id}`}
                  className="block px-6 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {s.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 flex items-center gap-2">
                        <span>{s.departmentName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{s.contentType}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">v{s.currentVersion}</span>
                      </div>
                    </div>
                    <SubmissionStatusLabel status={s.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Recent Audit Activity
            </h2>
          </div>
          {data.recentActivity.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No governance activity recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {data.recentActivity.map((log) => (
                <div key={log.id} className="px-6 py-3.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-800">
                      {log.userName || 'System'}
                    </span>
                    <span className="font-mono tabular-nums">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-700 leading-relaxed">
                    {log.details}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
