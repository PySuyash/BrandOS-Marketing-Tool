import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { SubmissionStatusLabel } from '../components/StatusText.jsx';

export function ApprovalsPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canReject = user?.role === 'Manager' || user?.role === 'Admin';

  useEffect(() => {
    api
      .get('/submissions')
      .then((res) => setSubmissions(res.data.submissions || []))
      .catch((err) => {
        notify(
          err?.response?.data?.error || 'Failed to load approval queue.',
          'error'
        );
      })
      .finally(() => setLoading(false));
  }, [notify]);

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectTarget || deleting) return;
    setDeleting(true);
    try {
      await api.post(`/submissions/${rejectTarget.id}/reject`, {
        reason: rejectReason,
      });

      setSubmissions((prev) =>
        prev.filter((item) => item.id !== rejectTarget.id)
      );
      window.dispatchEvent(
        new CustomEvent('brandos:notifications-changed', {
          detail: { removedSubmissionId: rejectTarget.id },
        })
      );
      notify('Submission rejected and permanently deleted.', 'success');
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      notify(
        err?.response?.data?.error ||
          'Failed to reject and delete submission.',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  const displayed =
    filter === 'pending'
      ? submissions.filter((s) =>
          ['Under Review', 'Resubmitted', 'Changes Requested'].includes(s.status)
        )
      : submissions;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Approvals & Verification Queue
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review department submissions, verify Unverified claims in the Claim Ledger, and record final publication decisions.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              filter === 'pending'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Action Queue
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Decisions
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading approval queue...</div>
        ) : displayed.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No submissions currently require your approval action.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Submission</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3 text-right">Version</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      {s.title}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{s.departmentName}</td>
                    <td className="px-4 py-3.5 text-slate-600">{s.creatorName}</td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                      v{s.currentVersion}
                    </td>
                    <td className="px-4 py-3.5">
                      <SubmissionStatusLabel status={s.status} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="inline-flex items-center gap-3">
                        <Link
                          to={`/submissions/${s.id}`}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
                        >
                          Review & Decide
                        </Link>
                        {canReject && (
                          <button
                            type="button"
                            onClick={() => {
                              setRejectTarget(s);
                              setRejectReason('');
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Reject</span>
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

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={handleConfirmReject}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              Reject & Permanently Delete Submission
            </h3>
            <p className="text-xs text-slate-600">
              Submission: <span className="font-semibold text-slate-900">{rejectTarget.title}</span>
            </p>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900">
              Rejecting will permanently delete this post, its version history, findings, comments, and associated approval notifications.
            </div>
            <textarea
              rows={3}
              required
              minLength={4}
              disabled={deleting}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason before permanent deletion (min 4 chars)..."
              className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setRejectTarget(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Rejecting & Deleting...' : 'Reject & Delete Permanently'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
