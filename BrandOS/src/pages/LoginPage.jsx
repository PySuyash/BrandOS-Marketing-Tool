import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';

export function LoginPage() {
  const { user, loginWithCredentials, loginWithGoogle } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [demoPassword, setDemoPassword] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    api
      .get('/auth/demo-accounts')
      .then((res) => {
        setDemoAccounts(res.data.accounts || []);
        setDemoPassword(res.data.demoPasswordHint || '');
      })
      .catch(() => {
        // ignore if unavailable
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithCredentials(email, password);
      notify('Signed in to BrandOS.', 'success');
      navigate('/');
    } catch (err) {
      const msg =
        err?.response?.data?.error || 'Invalid email or password.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (acct) => {
    setEmail(acct.email);
    setPassword(demoPassword);
    setError(null);
    setSubmitting(true);
    try {
      await loginWithCredentials(acct.email, demoPassword);
      notify(`Signed in as ${acct.name} (${acct.role}).`, 'success');
      navigate('/');
    } catch {
      setError('Failed to sign in with demo account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      notify('Signed in with Google Workspace.', 'success');
      navigate('/');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Google sign-in cancelled or failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left column: Employee Sign-In Form */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-8">
              <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-slate-900">
                BrandOS
              </span>
            </div>

            <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              Employee Brand Governance Portal
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Sign in with your assigned department account to submit content, inspect Claim Ledger evidence, and manage approvals.
            </p>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator.marketing@brandos.demo"
                    className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                <span>{submitting ? 'Signing in...' : 'Sign In to Workspace'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>Sign in with Google Workspace SSO</span>
              </button>
            </div>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Core principle: No proof, no flag. Every finding and claim links to verified department guidelines or approved knowledge sources.
          </p>
        </div>

        {/* Right column: Prototype Demo Employee Accounts */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-8">
          <h2 className="font-display text-base font-bold text-slate-900">
            Prototype Demo Accounts
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Select any role below to sign in and walk through department-specific reviews, Claim Ledger verification, and approvals.
            {demoPassword && (
              <span className="block mt-1 font-mono text-slate-700">
                Common demo password: {demoPassword}
              </span>
            )}
          </p>

          <div className="mt-4 divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {demoAccounts.length === 0 ? (
              <div className="p-4 text-xs text-slate-500">Loading demo accounts...</div>
            ) : (
              demoAccounts.map((acct) => (
                <button
                  key={acct.id}
                  type="button"
                  onClick={() => handleDemoLogin(acct)}
                  disabled={submitting}
                  className="w-full text-left px-4 py-3 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {acct.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {acct.email} · {acct.departmentName || 'Cross-Department'}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs font-semibold text-indigo-700">
                      {acct.role}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
