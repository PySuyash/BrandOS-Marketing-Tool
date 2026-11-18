import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FilePlus2, Search } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { SubmissionStatusLabel } from '../components/StatusText.jsx';

const STATUS_TABS = [
  'All',
  'Under Review',
  'Changes Requested',
  'Resubmitted',
  'Approved',
];

export function SubmissionsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [query, setQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    api
      .get('/submissions')
      .then((res) => setSubmissions(res.data.submissions || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = submissions.filter((s) => {
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.departmentName.toLowerCase().includes(q) ||
      s.contentType.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            {user?.role === 'Creator' ? 'My Submissions' : 'Department Submissions'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Inspect findings, Claim Ledger verdicts, reviewer comments, and revision timelines.
          </p>
        </div>

        {(user?.role === 'Creator' || user?.role === 'Admin') && (
          <Link
            to="/review/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 whitespace-nowrap shrink-0"
          >
            <FilePlus2 className="h-4 w-4" />
            <span>New Review</span>
          </Link>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by title or type..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading submissions...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-sm font-medium text-slate-900">
              No matching submissions found
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Try adjusting your filter or start a new content review.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Type / Channel</th>
                  <th className="px-4 py-3">Creator</th>
                  <th className="px-4 py-3 text-right">Version</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      <Link
                        to={`/submissions/${s.id}`}
                        className="hover:text-indigo-700"
                      >
                        {s.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{s.departmentName}</td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs">
                      {s.contentType} · {s.channel}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{s.creatorName}</td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-700">
                      v{s.currentVersion}
                    </td>
                    <td className="px-4 py-3.5">
                      <SubmissionStatusLabel status={s.status} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        to={`/submissions/${s.id}`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
                      >
                        Open Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
