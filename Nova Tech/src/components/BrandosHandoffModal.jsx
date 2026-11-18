import { useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function BrandosHandoffModal() {
  const { user, brandosModal, closeBrandosModal, launchBrandos } = useAuth();
  const [showContract, setShowContract] = useState(false);

  if (!brandosModal.open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="brandos-handoff-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-950 text-white flex items-center justify-center shrink-0">
              {brandosModal.status === 'loading' ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              ) : brandosModal.status === 'ready' ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <h3 id="brandos-handoff-title" className="font-display text-lg font-bold text-slate-950">
                BrandOS Single Sign-On Handoff
              </h3>
              <p className="text-xs text-slate-500">
                Target route: <span className="font-mono">{brandosModal.targetRoute}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeBrandosModal}
            aria-label="Close BrandOS connection dialog"
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verified Server Identity Summary */}
        {user && (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="text-xs font-semibold text-slate-500 mb-2">
              Verified Employee Context (Server-Authoritative)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-slate-500 block">Employee</span>
                <span className="font-semibold text-slate-900">{user.name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Department</span>
                <span className="font-semibold text-blue-700">{user.department || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Internal BrandOS Role</span>
                <span className="font-semibold text-slate-900">{user.brandosRole || 'Creator'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Configured BrandOS URL</span>
                <span className="font-mono text-xs text-slate-700 break-all">
                  {brandosModal.configuredUrl || 'Not set'}
                </span>
              </div>
            </div>
          </div>
        )}

        {brandosModal.status === 'loading' && (
          <p className="mt-4 text-sm text-slate-600">
            Issuing a single-use cryptographic SSO ticket and verifying connectivity to BrandOS...
          </p>
        )}

        {brandosModal.status === 'ready' && brandosModal.redirectUrl && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-700">
              SSO ticket issued. Redirecting your authenticated session to BrandOS with preserved department and role context.
            </p>
            <a
              href={brandosModal.redirectUrl}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg"
            >
              <span>Open BrandOS Now</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {brandosModal.status === 'error' && (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-950">
              <p className="font-semibold">BrandOS Connection Not Established</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900">
                {brandosModal.errorMessage}
              </p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              For security, NovaTech never exposes session secrets in URLs or simulates shared authentication when the BrandOS server is unreachable or unconfigured.
            </p>

            <button
              type="button"
              onClick={() => setShowContract((v) => !v)}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              {showContract ? 'Hide Integration Contract' : 'View BrandOS SSO Integration Contract'}
            </button>

            {showContract && (
              <div className="rounded-lg border border-slate-200 bg-slate-950 text-slate-200 p-3.5 text-xs font-mono space-y-1.5 overflow-x-auto">
                <div>1. Set VITE_BRANDOS_URL &amp; BRANDOS_URL (e.g. http://localhost:5174)</div>
                <div>2. Ticket Exchange: POST /api/brandos/sso/exchange</div>
                <div>3. Publish Webhook: POST /api/brandos/publish</div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closeBrandosModal}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Close
          </button>
          {brandosModal.status === 'error' && (
            <button
              type="button"
              onClick={() => launchBrandos(brandosModal.targetRoute)}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
            >
              Retry Connection
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
