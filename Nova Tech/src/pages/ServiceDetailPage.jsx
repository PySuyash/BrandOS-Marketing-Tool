import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SERVICES } from '../data/companyData.js';
import MediaFrame from '../components/MediaFrame.jsx';

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const service = SERVICES.find((item) => item.slug === slug);

  if (!service) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-950">Service Not Found</h1>
        <p className="mt-3 text-slate-600">
          The requested service page does not exist.
        </p>
        <Link
          to="/services"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 text-white text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Services</span>
        </Link>
      </div>
    );
  }

  const otherServices = SERVICES.filter((s) => s.slug !== service.slug).slice(0, 3);

  return (
    <div>
      <section className="bg-slate-950 text-white py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Services</span>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <p className="font-mono text-xs font-semibold text-blue-400 tabular-nums mb-2">
                {service.number} NovaTech Service Practice
              </p>
              <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-balance">
                {service.name}
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                {service.fullDescription}
              </p>
              <div className="mt-8">
                <Link
                  to="/contact"
                  state={{ subject: `Enquiry: ${service.name}` }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                  <span>Request a Consultation</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-xl overflow-hidden border border-slate-800 aspect-[16/10]">
                <MediaFrame
                  src={service.image}
                  alt={service.name}
                  fallbackTitle={service.name}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-950">
                Core Technical Capabilities
              </h2>
              <ul className="mt-5 space-y-3.5">
                {service.capabilities.map((cap) => (
                  <li
                    key={cap}
                    className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/70"
                  >
                    <CheckCircle2 className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-slate-800">{cap}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 p-6 sm:p-8 bg-white">
              <h2 className="font-display text-xl font-bold text-slate-950">
                Operational & Business Value
              </h2>
              <p className="mt-3 text-slate-600 leading-relaxed">{service.businessValue}</p>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-7">
              <h3 className="font-display text-lg font-bold text-slate-950">
                Typical Engagement Deliverables
              </h3>
              <ul className="mt-4 divide-y divide-slate-200">
                {service.deliverables.map((item, idx) => (
                  <li key={item} className="py-3 flex items-center justify-between text-sm">
                    <span className="text-slate-800 font-medium">{item}</span>
                    <span className="font-mono text-xs text-slate-400 tabular-nums">
                      0{idx + 1}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link
                  to="/contact"
                  state={{ subject: `Scope Request: ${service.name}` }}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
                >
                  <span>Start Scoping Discussion</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-xl font-bold text-slate-950 mb-6">
            Related Engineering Practices
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {otherServices.map((item) => (
              <Link
                key={item.slug}
                to={`/services/${item.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-6 hover:border-blue-300 transition-colors"
              >
                <p className="font-mono text-xs text-blue-700 mb-2">{item.number}</p>
                <h3 className="font-display text-base font-bold text-slate-950">{item.name}</h3>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">{item.shortDescription}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
