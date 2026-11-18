import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { apiClient, extractApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function LoginPage() {
  const { login, demoLogin, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [demoPasswordHint, setDemoPasswordHint] = useState('');

  const redirectTo = location.state?.from || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    apiClient
      .get('/auth/demo-accounts')
      .then(({ data }) => {
        if (data?.demoEnabled) {
          setDemoAccounts(Array.isArray(data.accounts) ? data.accounts : []);
          setDemoPasswordHint(data.demoPasswordHint || '');
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      const signedInUser = await login(email.trim(), password);
      addToast(`Signed in as ${signedInUser.name}.`, 'success');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(extractApiError(err, 'Invalid credentials. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoAccount) => {
    setEmail(demoAccount.email);
    setPassword(demoPasswordHint);
    setError(null);
    setSubmitting(true);
    try {
      const signedInUser = await demoLogin(demoAccount.email);
      addToast(
        `Signed in as ${signedInUser.name} (${
          signedInUser.brandosRole || signedInUser.websiteRole
        }).`,
        'success'
      );
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(extractApiError(err, 'Demo account sign-in failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 py-14 sm:py-20 min-h-[calc(100vh-12rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Login Card */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-7 sm:p-9">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            Sign in to NovaTech
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Access your customer account, employee BrandOS gateway, or site administration console.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-slate-800 mb-1.5"
              >
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                placeholder="marketing@novatech.demo"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-800 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>{submitting ? 'Signing In...' : 'Sign In'}</span>
            </button>
          </form>

          <p className="mt-6 pt-5 border-t border-slate-100 text-sm text-slate-600 text-center">
            New client?{' '}
            <Link to="/register" className="font-semibold text-blue-700 hover:text-blue-900">
              Create a Customer Account
            </Link>
          </p>
        </div>

        {/* Demonstration Account Directory */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-7 sm:p-9">
          <h2 className="font-display text-lg font-bold text-slate-950">
            Demonstration Accounts
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            Click any role below to sign in directly via server-authenticated session, or enter the email and demo password manually.
          </p>

          {demoPasswordHint && (
            <p className="mt-3 text-xs text-slate-500">
              Demo password:{' '}
              <span className="font-mono text-slate-900 select-all">{demoPasswordHint}</span>
            </p>
          )}

          <div className="mt-5 divide-y divide-slate-100 border-t border-b border-slate-200">
            {demoAccounts.length === 0 ? (
              <p className="py-4 text-xs text-slate-500">Loading demonstration accounts...</p>
            ) : (
              demoAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950 truncate">
                      {acc.websiteRole === 'customer'
                        ? 'Customer'
                        : `${acc.brandosRole} — ${acc.department}`}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        · {acc.name}
                      </span>
                    </p>
                    <p className="font-mono text-xs text-slate-500 truncate select-all">
                      {acc.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={submitting}
                    aria-label={`Sign in as ${acc.name} (${acc.email})`}
                    onClick={() => handleDemoLogin(acc)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Sign In
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
