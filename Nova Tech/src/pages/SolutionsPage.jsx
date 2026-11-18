import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SOLUTION_CONCEPTS } from '../data/companyData.js';
import MediaFrame from '../components/MediaFrame.jsx';
import SectionHeading from '../components/SectionHeading.jsx';

export default function SolutionsPage() {
  return (
    <div>
      <section className="bg-slate-950 text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            dark
            eyebrow="Solutions Architecture"
            title="Demonstration Solution Areas for Real Operational Challenges"
            description="These solution blueprints illustrate how NovaTech designs AI-assisted tools, approval workflows, internal platforms like BrandOS, and customer-facing applications. All examples below are demonstration concepts."
          />
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {SOLUTION_CONCEPTS.map((sol) => (
            <div
              key={sol.id}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden grid grid-cols-1 lg:grid-cols-12"
            >
              <div className="lg:col-span-5 min-h-[240px]">
                <MediaFrame
                  src={sol.image}
                  alt={sol.title}
                  fallbackTitle={sol.title}
                  className="w-full h-full"
                />
              </div>

              <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
                    <span className="font-semibold text-blue-700">{sol.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{sol.conceptLabel}</span>
                  </div>

                  <h2 className="font-display text-2xl font-bold text-slate-950">
                    {sol.title}
                  </h2>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5 pt-5 border-t border-slate-100">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900 mb-1.5">
                        Business Problem Addressed
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{sol.problem}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900 mb-1.5">
                        Architectural Approach
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{sol.approach}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-slate-900 mb-1.5">
                        Target Outcome
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{sol.outcome}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-500">
                    Tailored implementation scoped to client systems
                  </span>
                  <Link
                    to="/contact"
                    state={{ subject: `Solution Enquiry: ${sol.title}` }}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap"
                  >
                    <span>Discuss This Architecture</span>
                    <ArrowRight className="w-4 h-4" />
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
