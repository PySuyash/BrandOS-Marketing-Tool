import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2, Mail, MapPin, Phone, Send } from 'lucide-react';
import { apiClient, extractApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import SectionHeading from '../components/SectionHeading.jsx';

export default function ContactPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const location = useLocation();

  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    subject: location.state?.subject || '',
    message: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedRecord, setSubmittedRecord] = useState(null);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        company: prev.company || user.company || '',
      }));
    }
  }, [user]);

  const validateClient = () => {
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      errs.email = 'Please enter a valid business email address.';
    }
    if (form.subject.trim().length < 3) errs.subject = 'Please provide a subject.';
    if (form.message.trim().length < 15) {
      errs.message = 'Please describe your enquiry in at least 15 characters.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateClient()) return;

    setSubmitting(true);
    try {
      const { data } = await apiClient.post('/contact', form);
      setSubmittedRecord(data.enquiry);
      addToast('Enquiry received successfully.', 'success');
      setForm((prev) => ({ ...prev, subject: '', message: '' }));
      setFieldErrors({});
    } catch (err) {
      const respErrors = err?.response?.data?.fieldErrors;
      if (respErrors) setFieldErrors(respErrors);
      const msg = extractApiError(err, 'Could not submit your enquiry.');
      setSubmitError(msg);
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <section className="bg-slate-950 text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            dark
            eyebrow="Contact Us"
            title="Start a Conversation With Our Engineering & Advisory Team"
            description="Share your software initiative, workflow automation goal, or architectural challenge. All enquiries are stored securely and visible in your customer dashboard when signed in."
          />
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-7">
            {submittedRecord ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-8">
                <div className="flex items-center gap-3 text-emerald-800">
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <h2 className="font-display text-xl font-bold">
                    Enquiry Saved Successfully
                  </h2>
                </div>
                <p className="mt-3 text-sm text-emerald-900 leading-relaxed">
                  Reference ID:{' '}
                  <span className="font-mono font-semibold">{submittedRecord.id}</span>. Our solutions team has received your enquiry regarding &ldquo;{submittedRecord.subject}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmittedRecord(null)}
                  className="mt-6 px-4 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold"
                >
                  Send Another Enquiry
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5"
              >
                <h2 className="font-display text-2xl font-bold text-slate-950">
                  Business Enquiry Form
                </h2>

                {submitError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
                  >
                    {submitError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-sm font-medium text-slate-800 mb-1.5"
                    >
                      Full Name *
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                      placeholder="Jordan Lee"
                    />
                    {fieldErrors.name && (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-sm font-medium text-slate-800 mb-1.5"
                    >
                      Business Email *
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                      placeholder="jordan@company.com"
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.email}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="contact-company"
                      className="block text-sm font-medium text-slate-800 mb-1.5"
                    >
                      Company / Organization
                    </label>
                    <input
                      id="contact-company"
                      type="text"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                      placeholder="Northstar Systems"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-subject"
                      className="block text-sm font-medium text-slate-800 mb-1.5"
                    >
                      Subject *
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                      placeholder="Custom platform scoping"
                    />
                    {fieldErrors.subject && (
                      <p className="mt-1 text-xs text-red-700">{fieldErrors.subject}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-sm font-medium text-slate-800 mb-1.5"
                  >
                    Project or Enquiry Details *
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:outline-2 focus:outline-blue-700"
                    placeholder="Outline your timeline, integration needs, or business objectives..."
                  />
                  {fieldErrors.message && (
                    <p className="mt-1 text-xs text-red-700">{fieldErrors.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Submitting Enquiry...' : 'Submit Enquiry'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Sample Corporate Contact Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
              <p className="text-xs font-semibold text-blue-700 mb-2">
                Sample Demonstration Office Details
              </p>
              <h3 className="font-display text-xl font-bold text-slate-950">
                Direct Channels
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                The addresses and phone numbers below are fictional demonstration contact details for the NovaTech corporate site.
              </p>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-950">General &amp; Sales Enquiries</p>
                    <p className="text-slate-600">hello@novatech.demo</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-950">Sample Advisory Desk</p>
                    <p className="font-mono text-xs text-slate-600 tabular-nums">
                      +1 (555) 014-8290
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-950">Demonstration Headquarters</p>
                    <p className="text-slate-600">
                      400 Harbor View Drive, Suite 900, Sample Metro District
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <h3 className="font-display text-lg font-bold text-slate-950">
                What Happens Next?
              </h3>
              <ol className="mt-4 space-y-3 text-sm text-slate-600 list-decimal list-inside">
                <li>Your enquiry is validated and persisted in NovaTech&apos;s backend.</li>
                <li>Signed-in customers can track their enquiry status inside their Dashboard.</li>
                <li>An enterprise solutions lead reviews scope and follows up within one business day.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
