import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Info,
  XCircle,
} from 'lucide-react';

export function SubmissionStatusLabel({ status }) {
  switch (status) {
    case 'Approved':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          Approved
        </span>
      );
    case 'Changes Requested':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          Changes Requested
        </span>
      );
    case 'Rejected':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
          <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
          Rejected
        </span>
      );
    case 'Resubmitted':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          Resubmitted
        </span>
      );
    case 'Under Review':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          Under Review
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
          <Info className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          {status}
        </span>
      );
  }
}

export function SeverityLabel({ severity }) {
  if (severity === 'Blocker') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
        <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
        Blocker
      </span>
    );
  }
  if (severity === 'Major') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        Major
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
      <Info className="h-3.5 w-3.5 text-slate-500 shrink-0" />
      Minor
    </span>
  );
}

export function ClaimVerdictLabel({ verdict }) {
  if (verdict === 'SUPPORTED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        SUPPORTED
      </span>
    );
  }
  if (verdict === 'CONFLICTS') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
        <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
        CONFLICTS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
      <HelpCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
      UNVERIFIED
    </span>
  );
}
