import { Link } from 'react-router-dom';
import { SERVICES } from '../data/companyData.js';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-2.5 text-white">
              <svg
                width="26"
                height="26"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect width="28" height="28" rx="7" fill="#1E293B" />
                <path
                  d="M8.5 19.5V8.5L19.5 19.5V8.5"
                  stroke="#60A5FA"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-display text-lg font-bold tracking-tight">NovaTech</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Building intelligent digital experiences that help businesses grow. Technology That Moves Businesses Forward.
            </p>
            <p className="text-xs text-slate-500">
              Demonstration corporate website integrated with BrandOS content governance.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display text-sm font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="text-slate-400 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-slate-400 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/solutions" className="text-slate-400 hover:text-white transition-colors">
                  Solutions
                </Link>
              </li>
              <li>
                <Link to="/insights" className="text-slate-400 hover:text-white transition-colors">
                  Insights
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-slate-400 hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-display text-sm font-semibold text-white mb-4">Services</h3>
            <ul className="space-y-2.5 text-sm">
              {SERVICES.map((service) => (
                <li key={service.slug}>
                  <Link
                    to={`/services/${service.slug}`}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info (Explicitly Sample Demo Details) */}
          <div>
            <h3 className="font-display text-sm font-semibold text-white mb-4">
              Sample Contact Details
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>400 Harbor View Drive, Suite 900</li>
              <li>Sample Metro District, Demo Location</li>
              <li>
                <a
                  href="mailto:hello@novatech.demo"
                  className="hover:text-white transition-colors"
                >
                  hello@novatech.demo
                </a>
              </li>
              <li className="font-mono text-xs tabular-nums text-slate-400">
                +1 (555) 014-8290 (Sample)
              </li>
            </ul>
            <div className="mt-5 flex items-center gap-4 text-xs">
              <Link to="/insights" className="text-slate-400 hover:text-white transition-colors">
                LinkedIn Feed
              </Link>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <Link to="/solutions" className="text-slate-400 hover:text-white transition-colors">
                Engineering Blog
              </Link>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <Link to="/contact" className="text-slate-400 hover:text-white transition-colors">
                Enquiries
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} NovaTech Demonstration Platform. Fictional company demonstration content.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/legal/privacy" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/legal/terms" className="hover:text-slate-300 transition-colors">
              Terms and Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
