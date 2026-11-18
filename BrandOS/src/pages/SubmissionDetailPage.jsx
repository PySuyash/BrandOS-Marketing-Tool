import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Edit3,
  History,
  Info,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  ClaimVerdictLabel,
  SeverityLabel,
  SubmissionStatusLabel,
} from '../components/StatusText.jsx';

export function SubmissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();

  const [data, setData] = useState(null);
  const [deptFacts, setDeptFacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('findings');
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [editedSuggestion, setEditedSuggestion] = useState('');
  const [dismissFindingId, setDismissFindingId] = useState(null);
  const [dismissReason, setDismissReason] = useState('');

  // Revision editor
  const [editMode, setEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);
  const [runningReview, setRunningReview] = useState(false);

  // Comments
  const [commentText, setCommentText] = useState('');
  const [commentFindingId, setCommentFindingId] = useState(null);
  const [replyParentId, setReplyParentId] = useState(null);
  const [postingComment, setPostingComment] = useState(false);

  // Reviewer claim verification modal state
  const [verifyingClaimId, setVerifyingClaimId] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState('Verified');
  const [verifyVerdict, setVerifyVerdict] = useState('SUPPORTED');
  const [verifySourceId, setVerifySourceId] = useState('');
  const [verifyNote, setVerifyNote] = useState('');

  // Manager approval decision modal state
  const [decisionModal, setDecisionModal] = useState(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [overrideWarning, setOverrideWarning] = useState(null);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await api.get(`/submissions/${id}`);
      setData(res.data);
      setDraftContent(res.data.currentVersionData?.content || '');

      if (res.data.findings.length > 0) {
        const firstOpen =
          res.data.findings.find((f) => f.status === 'Open') ||
          res.data.findings[0];
        setSelectedFindingId((prev) =>
          res.data.findings.some((f) => f.id === prev) ? prev : firstOpen.id
        );
      } else {
        setSelectedFindingId(null);
      }

      const kRes = await api.get(`/knowledge/${res.data.submission.departmentId}`);
      setDeptFacts(kRes.data.knowledgeItems || []);
    } catch (err) {
      const msg =
        err?.response?.data?.error || 'Unable to load submission.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const selectedFinding = useMemo(
    () => data?.findings.find((f) => f.id === selectedFindingId) || null,
    [data, selectedFindingId]
  );

  useEffect(() => {
    if (selectedFinding) {
      setEditedSuggestion(selectedFinding.suggestion);
    }
  }, [selectedFinding]);

  // Render highlighted spans inside the submitted text
  const renderedHighlightedText = useMemo(() => {
    if (!data?.currentVersionData) return null;
    const text = data.currentVersionData.content;
    const openFindings = data.findings.filter(
      (f) => f.status === 'Open' && !f.highlightedText.startsWith('[Missing')
    );

    if (openFindings.length === 0) {
      return (
        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
          {text}
        </p>
      );
    }

    let segments = [{ text }];

    for (const f of openFindings) {
      const nextSegments = [];
      for (const seg of segments) {
        if (seg.finding) {
          nextSegments.push(seg);
          continue;
        }
        const idx = seg.text
          .toLowerCase()
          .indexOf(f.highlightedText.toLowerCase());
        if (idx === -1) {
          nextSegments.push(seg);
        } else {
          if (idx > 0) nextSegments.push({ text: seg.text.slice(0, idx) });
          nextSegments.push({
            text: seg.text.slice(idx, idx + f.highlightedText.length),
            finding: f,
          });
          if (idx + f.highlightedText.length < seg.text.length) {
            nextSegments.push({
              text: seg.text.slice(idx + f.highlightedText.length),
            });
          }
        }
      }
      segments = nextSegments;
    }

    return (
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
        {segments.map((seg, i) =>
          seg.finding ? (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSelectedFindingId(seg.finding.id);
                setActiveTab('findings');
              }}
              className={`inline rounded px-1 py-0.5 font-medium transition-colors ${
                seg.finding.id === selectedFindingId
                  ? 'bg-indigo-100 text-indigo-950 ring-2 ring-indigo-500'
                  : seg.finding.severity === 'Blocker'
                  ? 'bg-red-100 text-red-900 hover:bg-red-200'
                  : seg.finding.severity === 'Major'
                  ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                  : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
              }`}
            >
              {seg.text}
            </button>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </p>
    );
  }, [data, selectedFindingId]);

  const handleRunReview = async () => {
    if (!data) return;
    setRunningReview(true);
    try {
      const res = await api.post(`/reviews/${data.submission.id}/run`);
      notify(
        `Review updated (${res.data.findingsCount} findings, ${res.data.claimsCount} claims).`,
        'success'
      );
      await fetchDetail();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Review execution failed.';
      notify(msg, 'error');
    } finally {
      setRunningReview(false);
    }
  };

  const handleAcceptSuggestion = async (finding, customText) => {
    try {
      await api.post(`/findings/${finding.id}/accept`, {
        editedSuggestion: customText ?? finding.suggestion,
      });
      notify(
        `Applied correction for ${finding.ruleCode} and saved new version.`,
        'success'
      );
      await fetchDetail();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Could not apply suggestion.';
      notify(msg, 'error');
    }
  };

  const handleDismissSubmit = async (e) => {
    e.preventDefault();
    if (!dismissFindingId) return;
    try {
      await api.post(`/findings/${dismissFindingId}/dismiss`, {
        reason: dismissReason,
      });
      notify('Finding dismissed and reason recorded in audit log.', 'success');
      setDismissFindingId(null);
      setDismissReason('');
      await fetchDetail();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to dismiss finding.';
      notify(msg, 'error');
    }
  };

  const handleSaveNewVersion = async (submitForApproval) => {
    if (!data) return;
    setSavingVersion(true);
    try {
      await api.put(`/submissions/${data.submission.id}`, {
        content: draftContent,
        changeSummary:
          changeSummary.trim() ||
          (submitForApproval
            ? 'Revised content and submitted for approval.'
            : 'Saved revised content version.'),
        submitForApproval,
        runReview: true,
      });
      setEditMode(false);
      setChangeSummary('');
      notify(
        submitForApproval
          ? 'Saved new version and submitted for approval.'
          : 'Saved new version and refreshed review findings.',
        'success'
      );
      if (submitForApproval) {
        window.dispatchEvent(new CustomEvent('brandos:notifications-changed'));
      }
      await fetchDetail();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to save version.';
      notify(msg, 'error');
    } finally {
      setSavingVersion(false);
    }
  };

  const handleSubmitForApprovalOnly = async () => {
    if (!data) return;
    setSavingVersion(true);
    try {
      await api.put(`/submissions/${data.submission.id}`, {
        submitForApproval: true,
        runReview: false,
      });
      notify('Submission routed to Manager & Reviewer approval queue.', 'success');
      window.dispatchEvent(new CustomEvent('brandos:notifications-changed'));
      await fetchDetail();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to submit for approval.';
      notify(msg, 'error');
    } finally {
      setSavingVersion(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!data || !commentText.trim()) return;
    setPostingComment(true);
    try {
      await api.post(`/submissions/${data.submission.id}/comments`, {
        commentText,
        findingId: commentFindingId,
        parentId: replyParentId,
      });
      setCommentText('');
      setCommentFindingId(null);
      setReplyParentId(null);
      notify('Comment added.', 'success');
      await fetchDetail();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to post comment.';
      notify(msg, 'error');
    } finally {
      setPostingComment(false);
    }
  };

  const handleVerifyClaimSubmit = async (e) => {
    e.preventDefault();
    if (!verifyingClaimId) return;
    try {
      await api.post(`/claims/${verifyingClaimId}/verify`, {
        reviewerStatus: verifyStatus,
        verdict: verifyVerdict,
        sourceId: verifySourceId ? Number(verifySourceId) : null,
        note: verifyNote,
      });
      setVerifyingClaimId(null);
      setVerifyNote('');
      notify('Claim verification decision recorded.', 'success');
      window.dispatchEvent(new CustomEvent('brandos:notifications-changed'));
      await fetchDetail();
    } catch (err) {
      const msg =
        err?.response?.data?.error || 'Failed to record claim verification.';
      notify(msg, 'error');
    }
  };

  const handleApprovalAction = async (e) => {
    e.preventDefault();
    if (!data || !decisionModal || decisionSubmitting) return;
    setDecisionSubmitting(true);
    try {
      if (decisionModal === 'approve') {
        await api.post(`/submissions/${data.submission.id}/approve`, {
          reason: decisionReason || 'Approved for publication.',
        });
        notify('Submission approved.', 'success');
        window.dispatchEvent(new CustomEvent('brandos:notifications-changed'));
      } else if (decisionModal === 'override') {
        await api.post(`/submissions/${data.submission.id}/approve`, {
          overrideReason: decisionReason,
        });
        notify('Submission approved with Manager Override.', 'success');
        window.dispatchEvent(new CustomEvent('brandos:notifications-changed'));
      } else if (decisionModal === 'changes') {
        await api.post(`/submissions/${data.submission.id}/request-changes`, {
          reason: decisionReason,
        });
        notify('Changes requested.', 'info');
        window.dispatchEvent(new CustomEvent('brandos:notifications-changed'));
      } else if (decisionModal === 'reject') {
        const deletedId = data.submission.id;
        await api.post(`/submissions/${deletedId}/reject`, {
          reason: decisionReason,
        });
        window.dispatchEvent(
          new CustomEvent('brandos:notifications-changed', {
            detail: { removedSubmissionId: deletedId },
          })
        );
        setDecisionModal(null);
        setDecisionReason('');
        setOverrideWarning(null);
        notify('Submission rejected and permanently deleted.', 'success');
        navigate('/approvals', { replace: true });
        return;
      }
      setDecisionModal(null);
      setDecisionReason('');
      setOverrideWarning(null);
      await fetchDetail();
    } catch (err) {
      const resp = err?.response;
      if (resp?.status === 409 && resp.data?.requiresOverride) {
        setOverrideWarning(resp.data.error || 'Override reason required.');
        setDecisionModal('override');
        setDecisionReason('');
      } else {
        notify(resp?.data?.error || 'Action failed.', 'error');
      }
    } finally {
      setDecisionSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading review workspace...</div>;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-6 text-sm text-red-700">
        {error || 'Submission not found.'}
      </div>
    );
  }

  const { submission, findings, claims, comments, approvals } = data;
  const openFindings = findings.filter((f) => f.status === 'Open');
  const blockerCount = openFindings.filter((f) => f.severity === 'Blocker').length;
  const majorCount = openFindings.filter((f) => f.severity === 'Major').length;
  const minorCount = openFindings.filter((f) => f.severity === 'Minor').length;
  const unverifiedCount = claims.filter((c) => c.verdict === 'UNVERIFIED').length;
  const conflictCount = claims.filter((c) => c.verdict === 'CONFLICTS').length;

  const isCreatorOrAdmin = user?.role === 'Creator' || user?.role === 'Admin';
  const isManagerOrAdmin = user?.role === 'Manager' || user?.role === 'Admin';
  const isReviewerOrAdmin = user?.role === 'Reviewer' || user?.role === 'Admin';

  return (
    <div className="space-y-6">
      {/* Header & Status Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-indigo-700">
                {submission.departmentName}
              </span>
              <span aria-hidden="true">·</span>
              <span>{submission.contentType}</span>
              <span aria-hidden="true">·</span>
              <span>{submission.channel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Version {submission.currentVersion}</span>
              <span aria-hidden="true">·</span>
              <span>By {submission.creatorName}</span>
            </div>
            <h1 className="mt-1.5 font-display text-2xl font-bold text-slate-900 tracking-tight">
              {submission.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <SubmissionStatusLabel status={submission.status} />
              <Link
                to={`/submissions/${submission.id}/versions`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-700"
              >
                <History className="h-3.5 w-3.5" />
                <span>View Version Timeline ({data.versions.length})</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleRunReview}
              disabled={runningReview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${runningReview ? 'animate-spin' : ''}`} />
              <span>{runningReview ? 'Re-checking...' : 'Re-run Review'}</span>
            </button>

            {isCreatorOrAdmin && (
              <button
                type="button"
                onClick={handleSubmitForApprovalOnly}
                disabled={savingVersion}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit for Approval</span>
              </button>
            )}

            {(isManagerOrAdmin || isReviewerOrAdmin) && (
              <button
                type="button"
                onClick={() => {
                  setDecisionReason('');
                  setDecisionModal('changes');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Request Changes</span>
              </button>
            )}

            {isManagerOrAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDecisionReason('');
                    setDecisionModal('approve');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Approve</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDecisionReason('');
                    setDecisionModal('reject');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Summary Counters */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-6 gap-4 text-xs">
          <div>
            <span className="text-slate-500">Total Findings</span>
            <div className="mt-0.5 font-mono text-base font-bold text-slate-900 tabular-nums">
              {findings.length}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Open Blockers</span>
            <div className="mt-0.5 font-mono text-base font-bold text-red-700 tabular-nums">
              {blockerCount}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Open Major</span>
            <div className="mt-0.5 font-mono text-base font-bold text-amber-700 tabular-nums">
              {majorCount}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Open Minor</span>
            <div className="mt-0.5 font-mono text-base font-bold text-slate-700 tabular-nums">
              {minorCount}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Conflicting Claims</span>
            <div className="mt-0.5 font-mono text-base font-bold text-red-700 tabular-nums">
              {conflictCount}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Unverified Claims</span>
            <div className="mt-0.5 font-mono text-base font-bold text-amber-700 tabular-nums">
              {unverifiedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Honest AI Fallback Banner if deterministic demo-review mode was used */}
      {submission.aiModeUsed === 'deterministic_fallback' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Deterministic Demo-Review Mode:</span>{' '}
            Live Gemini AI tone analysis was unavailable or unconfigured for this run. Fixed-rule checks and source-verified fact patterns ran deterministically, and unconfirmed claims default to <span className="font-semibold">UNVERIFIED</span>.
          </div>
        </div>
      )}

      {/* Workspace Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('findings')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'findings'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Findings & Content ({findings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'claims'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Claim Ledger ({claims.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('comments')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'comments'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Comments & Decisions ({comments.length + approvals.length})
        </button>
      </div>

      {/* TAB 1: FINDINGS & DOCUMENT CONTENT */}
      {activeTab === 'findings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Document Viewer / Editor + Findings List */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Submitted Content (Version {submission.currentVersion})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tone target: {submission.departmentTone}
                  </p>
                </div>

                {isCreatorOrAdmin && (
                  <button
                    type="button"
                    onClick={() => setEditMode((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>{editMode ? 'Cancel Edit' : 'Revise Content'}</span>
                  </button>
                )}
              </div>

              {editMode ? (
                <div className="mt-4 space-y-4">
                  <textarea
                    rows={7}
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 leading-relaxed focus:border-indigo-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder="Change summary (e.g., Replaced unverified #1 claim with 42,000+ metric)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={savingVersion}
                      onClick={() => handleSaveNewVersion(false)}
                      className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Save Version & Re-check
                    </button>
                    <button
                      type="button"
                      disabled={savingVersion}
                      onClick={() => handleSaveNewVersion(true)}
                      className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      Save Version & Submit for Approval
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4">{renderedHighlightedText}</div>
              )}
            </div>

            {/* Findings List */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Detected Rule Findings
                </h2>
              </div>
              {findings.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-600">
                  No rule violations detected on Version {submission.currentVersion}. Inspect the Claim Ledger tab to verify factual claims.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {findings.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFindingId(f.id)}
                      className={`w-full text-left px-6 py-4 transition-colors ${
                        f.id === selectedFindingId ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-semibold text-indigo-700">
                            {f.ruleCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <SeverityLabel severity={f.severity} />
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-500 capitalize">
                            {f.category.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-slate-600">
                          {f.status}
                        </span>
                      </div>
                      <div className="mt-1.5 text-sm font-medium text-slate-900">
                        “{f.highlightedText}”
                      </div>
                      <div className="mt-1 text-xs text-slate-600 line-clamp-2">
                        {f.explanation}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: 6-Part Finding Details & Suggestion Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
            {!selectedFinding ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Select a highlighted phrase or finding on the left to inspect supporting guideline evidence and suggested corrections.
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="text-xs font-mono font-semibold text-indigo-700">
                      {selectedFinding.findingCode} · {selectedFinding.ruleCode}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <SeverityLabel severity={selectedFinding.severity} />
                      <span className="text-xs text-slate-500">
                        · Status:{' '}
                        <strong className="text-slate-800">{selectedFinding.status}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-500 tabular-nums">
                    {selectedFinding.confidence}% conf.
                  </div>
                </div>

                {/* 6 Required Questions */}
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="text-xs font-semibold text-slate-500">
                      1. What was detected?
                    </div>
                    <div className="mt-1 font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      “{selectedFinding.highlightedText}”
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500">
                      2. Why is it a problem?
                    </div>
                    <p className="mt-1 text-slate-700 leading-relaxed">
                      {selectedFinding.explanation}
                    </p>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500">
                      3. Which department rule applies?
                    </div>
                    <div className="mt-1 font-mono text-xs text-indigo-700 font-semibold">
                      {selectedFinding.ruleCode} ({submission.departmentName})
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500">
                      4. What evidence supports the finding?
                    </div>
                    <p className="mt-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 leading-relaxed">
                      {selectedFinding.evidence}
                    </p>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500">
                      5. What is the suggested correction?
                    </div>
                    <textarea
                      rows={2}
                      value={editedSuggestion}
                      onChange={(e) => setEditedSuggestion(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500">
                      6. What will remain unchanged?
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {selectedFinding.unchangedNote}
                    </p>
                  </div>
                </div>

                {selectedFinding.dismissReason && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                    <span className="font-semibold">Recorded Reason:</span>{' '}
                    {selectedFinding.dismissReason}
                  </div>
                )}

                {/* Suggestion Management Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                  {selectedFinding.status === 'Open' && isCreatorOrAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleAcceptSuggestion(selectedFinding, editedSuggestion)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>
                          {editedSuggestion.trim() !==
                          selectedFinding.suggestion.trim()
                            ? 'Apply Edited Suggestion'
                            : 'Accept Suggestion'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDismissFindingId(selectedFinding.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <span>Dismiss with Reason</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setCommentFindingId(selectedFinding.id);
                      setCommentText(
                        `Regarding ${selectedFinding.ruleCode} ("${selectedFinding.highlightedText}"): `
                      );
                      setActiveTab('comments');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Ask Reviewer / Comment</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CLAIM LEDGER */}
      {activeTab === 'claims' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Claim Ledger — Source-Backed Fact Verification
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                No proof, no flag: unverified claims remain UNVERIFIED until matched to an approved department knowledge source or verified by a Reviewer.
              </p>
            </div>
          </div>

          {claims.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No factual, numerical, pricing, delivery, or ranking claims were extracted from this version.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {claims.map((c) => (
                <div key={c.id} className="p-6 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        <ClaimVerdictLabel verdict={c.verdict} />
                        <span aria-hidden="true">·</span>
                        <span className="capitalize font-medium text-slate-600">
                          {c.category.replace('_', ' ')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-500 tabular-nums">
                          {c.confidence}% confidence
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-slate-700">
                          Reviewer: {c.reviewerStatus}
                        </span>
                      </div>
                      <div className="text-base font-semibold text-slate-900">
                        “{c.claimText}”
                      </div>
                    </div>

                    {isReviewerOrAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setVerifyingClaimId(c.id);
                          setVerifyStatus('Verified');
                          setVerifyVerdict(c.verdict);
                          setVerifySourceId(c.sourceId ? String(c.sourceId) : '');
                          setVerifyNote(c.reviewerNote || '');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 shrink-0"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>Verify Claim</span>
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-slate-700">{c.explanation}</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs">
                    <div>
                      <div className="text-slate-500 font-medium">Supporting Source</div>
                      <div className="mt-1 text-slate-900 font-medium">
                        {c.sourceCode ? (
                          <>
                            <span className="font-mono text-indigo-700">{c.sourceCode}</span>{' '}
                            · {c.sourceTitle}
                          </>
                        ) : (
                          'None found in department knowledge base'
                        )}
                      </div>
                      {c.sourceQuote && (
                        <div className="mt-1 text-slate-600 italic">
                          “{c.sourceQuote}”
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-slate-500 font-medium">Source Owner</div>
                      <div className="mt-1 text-slate-900">
                        {c.sourceOwner || 'Unassigned'}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-500 font-medium">Source Expiry Date</div>
                      <div className="mt-1 font-mono text-slate-900 tabular-nums">
                        {c.sourceExpiryDate || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {c.suggestion && (
                    <div className="text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">
                        Suggested Correction:
                      </span>{' '}
                      {c.suggestion}
                    </div>
                  )}

                  {c.reviewerNote && (
                    <div className="text-xs text-indigo-900 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                      <span className="font-semibold">Reviewer Note:</span>{' '}
                      {c.reviewerNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMMENTS & APPROVAL DECISIONS */}
      {activeTab === 'comments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Comment Thread */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Review Comments
            </h2>

            {comments.length === 0 ? (
              <div className="py-6 text-sm text-slate-500">
                No comments yet on this submission.
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((cm) => (
                  <div
                    key={cm.id}
                    className={`rounded-lg border border-slate-200 p-3.5 ${
                      cm.parentId ? 'ml-6 bg-slate-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="font-semibold text-slate-900">
                        {cm.authorName}{' '}
                        <span className="font-normal text-indigo-700">
                          · {cm.authorRole}
                        </span>
                      </div>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {new Date(cm.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-700">{cm.commentText}</p>
                    <button
                      type="button"
                      onClick={() => setReplyParentId(cm.id)}
                      className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Reply
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={handlePostComment}
              className="pt-4 border-t border-slate-100 space-y-3"
            >
              {replyParentId && (
                <div className="flex items-center justify-between text-xs text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg">
                  <span>Replying to comment #{replyParentId}</span>
                  <button
                    type="button"
                    onClick={() => setReplyParentId(null)}
                    className="underline"
                  >
                    Cancel reply
                  </button>
                </div>
              )}
              <textarea
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment for the creator, manager, or reviewer..."
                className="w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={postingComment || !commentText.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{postingComment ? 'Posting...' : 'Post Comment'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Approval Decision Log */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Approval Decisions
            </h2>
            {approvals.length === 0 ? (
              <div className="py-6 text-sm text-slate-500">
                No formal approval decisions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {approvals.map((a) => (
                  <div key={a.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">{a.decision}</span>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      By {a.reviewerName} · {a.reviewerRole}
                    </div>
                    <p className="mt-1.5 text-sm text-slate-700">{a.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Dismiss Finding with Required Reason */}
      {dismissFindingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={handleDismissSubmit}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              Dismiss Finding (Audit Reason Required)
            </h3>
            <p className="text-xs text-slate-600">
              Dismissed findings remain stored in audit logs and are never silently deleted.
            </p>
            <textarea
              rows={3}
              required
              minLength={4}
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              placeholder="Explain why this finding does not apply or is intentionally retained..."
              className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDismissFindingId(null);
                  setDismissReason('');
                }}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Confirm Dismiss
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Reviewer Claim Verification */}
      {verifyingClaimId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={handleVerifyClaimSubmit}
            className="w-full max-w-lg bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              Reviewer Claim Verification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reviewer Decision
                </label>
                <select
                  value={verifyStatus}
                  onChange={(e) => setVerifyStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="Verified">Verified</option>
                  <option value="Evidence Insufficient">Evidence Insufficient</option>
                  <option value="Needs More Info">Needs More Info</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Claim Verdict
                </label>
                <select
                  value={verifyVerdict}
                  onChange={(e) => setVerifyVerdict(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="SUPPORTED">SUPPORTED</option>
                  <option value="CONFLICTS">CONFLICTS</option>
                  <option value="UNVERIFIED">UNVERIFIED</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Link Approved Knowledge Source
              </label>
              <select
                value={verifySourceId}
                onChange={(e) => setVerifySourceId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">No approved source linked</option>
                {deptFacts.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.factCode} — {f.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Evidence & Verification Note
              </label>
              <textarea
                rows={3}
                value={verifyNote}
                onChange={(e) => setVerifyNote(e.target.value)}
                placeholder="Document your verification check or requested evidence..."
                className="w-full rounded-lg border border-slate-200 p-3 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setVerifyingClaimId(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Record Verification
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Manager Approval / Changes / Reject / Override */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={handleApprovalAction}
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              {decisionModal === 'approve'
                ? 'Approve Submission'
                : decisionModal === 'override'
                ? 'Manager Override Required'
                : decisionModal === 'changes'
                ? 'Request Changes'
                : 'Reject & Permanently Delete Submission'}
            </h3>

            {decisionModal === 'reject' && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                Rejecting this submission will permanently delete the post, its version history, findings, comments, and pending approval notifications from the database.
              </div>
            )}

            {overrideWarning && decisionModal === 'override' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                {overrideWarning}
              </div>
            )}

            <textarea
              rows={3}
              required={decisionModal !== 'approve'}
              minLength={decisionModal === 'override' ? 8 : 4}
              disabled={decisionSubmitting}
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder={
                decisionModal === 'approve'
                  ? 'Optional approval note...'
                  : decisionModal === 'override'
                  ? 'Enter written Manager Override justification (min 8 chars)...'
                  : decisionModal === 'reject'
                  ? 'Enter rejection reason before permanent deletion (min 4 chars)...'
                  : 'Enter feedback or reason for the creator...'
              }
              className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={decisionSubmitting}
                onClick={() => {
                  setDecisionModal(null);
                  setOverrideWarning(null);
                }}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={decisionSubmitting}
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 ${
                  decisionModal === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : decisionModal === 'changes'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {decisionSubmitting
                  ? decisionModal === 'reject'
                    ? 'Rejecting & Deleting...'
                    : 'Processing...'
                  : decisionModal === 'reject'
                  ? 'Reject & Delete Permanently'
                  : 'Confirm Decision'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
