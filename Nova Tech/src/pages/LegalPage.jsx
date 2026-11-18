import { Link } from 'react-router-dom';

export default function LegalPage({ type = 'privacy' }) {
  const isPrivacy = type === 'privacy';

  return (
    <div className="bg-white py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <p className="text-xs font-semibold text-blue-700">
          NovaTech Demonstration Policy Notice
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-950 tracking-tight">
          {isPrivacy ? 'Privacy Policy' : 'Terms and Conditions'}
        </h1>
        <p className="text-sm text-slate-500">
          Sample demonstration legal text for the NovaTech corporate portal.
        </p>

        <div className="space-y-5 text-slate-700 text-sm sm:text-base leading-relaxed pt-4 border-t border-slate-200">
          {isPrivacy ? (
            <>
              <p>
                NovaTech stores account details, enquiry submissions, and authenticated session cookies solely to operate this corporate website demonstration and its BrandOS integration workflow.
              </p>
              <p>
                Authentication sessions use server-signed HttpOnly cookies. Internal employee review notes, BrandOS findings, and unpublished drafts are strictly separated from public website endpoints.
              </p>
              <p>
                Customers may review and update their profile settings and notification preferences at any time from their account dashboard.
              </p>
            </>
          ) : (
            <>
              <p>
                This website is a demonstration platform illustrating NovaTech&apos;s corporate presence, service capabilities, customer account portal, and BrandOS content governance integration.
              </p>
              <p>
                All company addresses, phone numbers, and team profiles displayed are fictional sample records. Public Insights content is governed by BrandOS approval workflows prior to release.
              </p>
              <p>
                Unauthorized attempts to access internal employee routes or alter account permissions are blocked by server-side role validation.
              </p>
            </>
          )}
        </div>

        <div className="pt-6">
          <Link
            to="/"
            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
