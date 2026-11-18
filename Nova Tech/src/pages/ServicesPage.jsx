import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { SERVICES } from '../data/companyData.js';
import MediaFrame from '../components/MediaFrame.jsx';
import SectionHeading from '../components/SectionHeading.jsx';

export default function ServicesPage() {
  return (
    <div>
      <section className="bg-slate-950 text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            dark
            eyebrow="Our Services"
            title="Full-Lifecycle Software Engineering & Intelligent Systems"
            description="Six core practices designed to help organizations build reliable software, streamline operations with practical AI, and modernize digital customer experiences."
          />
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {SERVICES.map((service, idx) => (
            <div
              key={service.slug}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pb-16 border-b border-slate-200 last:border-b-0 last:pb-0"
            >
              <div className={`lg:col-span-6 ${idx % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="rounded-xl overflow-hidden border border-slate-200 aspect-[16/10]">
                  <MediaFrame
                    src={service.image}
                    alt={service.name}
                    fallbackTitle={service.name}
                    className="w-full h-full"
                  />
                </div>
              </div>

              <div className={`lg:col-span-6 ${idx % 2 === 1 ? 'lg:order-1' : ''}`}>
                <p className="font-mono text-xs font-semibold text-blue-700 tabular-nums mb-2">
                  {service.number} Practice Area
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
                  {service.name}
                </h2>
                <p className="mt-3 text-base text-slate-600 leading-relaxed">
                  {service.fullDescription}
                </p>

                <div className="mt-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Key Capabilities
                  </h3>
                  <ul className="space-y-2">
                    {service.capabilities.map((cap) => (
                      <li key={cap} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 rounded-lg bg-slate-50 border border-slate-200 p-4">
                  <span className="text-xs font-semibold text-slate-900 block mb-1">
                    Business Value
                  </span>
                  <p className="text-sm text-slate-600">{service.businessValue}</p>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <Link
                    to={`/services/${service.slug}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors"
                  >
                    <span>Explore Service Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-50 text-sm font-semibold transition-colors"
                  >
                    <span>Discuss This Service</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
