import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, GitCompare, History } from 'lucide-react';
import { api } from '../lib/api.js';

function computeWordDiff(oldText, newText) {
  const a = oldText.split(/\s+/).filter(Boolean);
  const b = newText.split(/\s+/).filter(Boolean);
  const m = a.length;
  const n = b.length;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const tokens = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      tokens.push({ type: 'same', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      tokens.push({ type: 'removed', text: a[i] });
      i++;
    } else {
      tokens.push({ type: 'added', text: b[j] });
      j++;
    }
  }
  while (i < m) {
    tokens.push({ type: 'removed', text: a[i++] });
  }
  while (j < n) {
    tokens.push({ type: 'added', text: b[j++] });
  }
  return tokens;
}

export function VersionHistoryPage() {
  const { id } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubId, setSelectedSubId] = useState(id ? Number(id) : null);
  const [submissionTitle, setSubmissionTitle] = useState('');
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [baseVerNum, setBaseVerNum] = useState(1);
  const [targetVerNum, setTargetVerNum] = useState(1);

  useEffect(() => {
    if (id) setSelectedSubId(Number(id));
  }, [id]);

  useEffect(() => {
    api.get('/submissions').then((res) => {
      const list = res.data.submissions || [];
      setSubmissions(list);
      if (!selectedSubId && list[0]) {
        setSelectedSubId(list[0].id);
      } else if (list.length === 0) {
        setLoading(false);
      }
    });
  }, [selectedSubId]);

  useEffect(() => {
    if (!selectedSubId) return;
    setLoading(true);
    api
      .get(`/submissions/${selectedSubId}/versions`)
      .then((res) => {
        setSubmissionTitle(res.data.submission.title);
        const vList = res.data.versions || [];
        setVersions(vList);
        if (vList.length >= 2) {
          setTargetVerNum(vList[0].versionNumber);
          setBaseVerNum(vList[1].versionNumber);
        } else if (vList.length === 1) {
          setBaseVerNum(vList[0].versionNumber);
          setTargetVerNum(vList[0].versionNumber);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedSubId]);

  const baseVer = versions.find((v) => v.versionNumber === baseVerNum);
  const targetVer = versions.find((v) => v.versionNumber === targetVerNum);

  const diffTokens = useMemo(() => {
    if (!baseVer || !targetVer) return [];
    return computeWordDiff(baseVer.content, targetVer.content);
  }, [baseVer, targetVer]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {id && (
            <Link
              to={`/submissions/${id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Submission Review</span>
            </Link>
          )}
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Version History & Comparison
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Immutable audit snapshots of every draft, accepted correction, claim revision, and manager decision.
          </p>
        </div>

        {submissions.length > 0 && (
          <select
            value={selectedSubId || ''}
            onChange={(e) => setSelectedSubId(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 max-w-xs"
          >
            {submissions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} (v{s.currentVersion})
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-sm text-slate-500">Loading version timeline...</div>
      ) : versions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          No version history available.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Timeline */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100">
              <History className="h-4 w-4 text-indigo-600" />
              <span>Revision Timeline — {submissionTitle}</span>
            </div>

            <div className="space-y-4">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="rounded-lg border border-slate-200 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-indigo-700">
                      Version {v.versionNumber}
                    </span>
                    <span className="font-mono text-slate-400 tabular-nums">
                      {new Date(v.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    {v.changeSummary}
                  </div>
                  <div className="text-xs text-slate-500">
                    Author: {v.authorName} · {v.findingsCount ?? 0} findings ·{' '}
                    {v.claimsCount ?? 0} claims
                  </div>
                  {v.approvals && v.approvals.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      {v.approvals.map((a) => (
                        <div key={a.id} className="text-xs text-slate-700">
                          <span className="font-semibold">{a.decision}</span> by{' '}
                          {a.reviewerName}: “{a.reason}”
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Diff Comparison */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <GitCompare className="h-4 w-4 text-indigo-600" />
                <span>Compare Two Versions</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <select
                  value={baseVerNum}
                  onChange={(e) => setBaseVerNum(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.versionNumber}>
                      Base: v{v.versionNumber}
                    </option>
                  ))}
                </select>
                <span className="text-slate-400">→</span>
                <select
                  value={targetVerNum}
                  onChange={(e) => setTargetVerNum(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.versionNumber}>
                      Compare: v{v.versionNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-7">
              {diffTokens.map((tok, idx) => {
                if (tok.type === 'added') {
                  return (
                    <ins
                      key={idx}
                      className="bg-emerald-100 text-emerald-900 no-underline px-1 rounded mx-0.5 font-medium"
                    >
                      {tok.text}
                    </ins>
                  );
                }
                if (tok.type === 'removed') {
                  return (
                    <del
                      key={idx}
                      className="bg-red-100 text-red-800 px-1 rounded mx-0.5"
                    >
                      {tok.text}
                    </del>
                  );
                }
                return <span key={idx}>{tok.text} </span>;
              })}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>
                <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-200 align-middle mr-1.5" />
                Removed from v{baseVerNum}
              </span>
              <span>
                <span className="inline-block w-3 h-3 rounded bg-emerald-100 border border-emerald-200 align-middle mr-1.5" />
                Added in v{targetVerNum}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
