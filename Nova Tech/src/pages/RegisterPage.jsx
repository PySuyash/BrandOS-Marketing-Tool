import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { extractApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Full name must be at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await register(form);
      addToast('Customer account created.', 'success');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const respErrors = err?.response?.data?.fieldErrors;
      if (respErrors) setFieldErrors(respErrors);
      setError(extractApiError(err, 'Could not complete registration.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 py-14 sm:py-20 min-h-[calc(100vh-12rem)]">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 sm:p-9">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            Create Customer Account
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Register to manage your organization profile and track business enquiries. Employee and BrandOS roles are provisioned exclusively by NovaTech administrators.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-slate-800 mb-1.5">
                Full Name *
              </label>
              <input
                id="reg-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                placeholder="Alex Morgan"
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-red-700">{fieldErrors.name}</p>}
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-slate-800 mb-1.5">
                Work Email *
              </label>
              <input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                placeholder="alex@company.com"
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-700">{fieldErrors.email}</p>}
            </div>

            <div>
              <label htmlFor="reg-company" className="block text-sm font-medium text-slate-800 mb-1.5">
                Company
              </label>
              <input
                id="reg-company"
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                placeholder="Acme Logistics"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-slate-800 mb-1.5">
                Password (min. 8 characters) *
              </label>
              <input
                id="reg-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                placeholder="At least 8 characters"
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-700">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? 'Creating Account...' : 'Create Customer Account'}</span>
            </button>
          </form>

          <p className="mt-6 pt-5 border-t border-slate-100 text-sm text-slate-600 text-center">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-blue-700 hover:text-blue-900">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
