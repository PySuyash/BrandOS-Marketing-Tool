import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';
import { apiClient } from '../api/client.js';
import {
  ASSETS,
  SERVICES,
  SOLUTION_CONCEPTS,
  WHY_CHOOSE_ITEMS,
} from '../data/companyData.js';
import MediaFrame from '../components/MediaFrame.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import BlogCard from '../components/BlogCard.jsx';
import { CardSkeleton } from '../components/LoadingSkeleton.jsx';

const TRUST_PROPOSITIONS = [
  {
    title: 'Innovation with Purpose',
    description:
      'Every engineering decision begins with a measurable operational need—never novelty for its own sake.',
  },
  {
    title: 'Engineering Excellence',
    description:
      'Clean service boundaries, automated test coverage, and disciplined security validation from initial architecture to launch.',
  },
  {
    title: 'Customer-Centered Solutions',
    description:
      'Digital products designed around how teams and clients actually work, reducing friction across daily workflows.',
  },
];

const FEATURED_SOLUTION_CATEGORIES = [
  'Business Automation',
  'Intelligent Content Management',
  'Digital Platforms',
  'Data-Driven Applications',
];

export default function HomePage() {
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [insightsError, setInsightsError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoadingInsights(true);
    apiClient
      .get('/insights?featured=true')
      .then(({ data }) => {
        if (!active) return;
        setFeaturedArticles(Array.isArray(data.articles) ? data.articles.slice(0, 3) : []);
        setInsightsError(null);
      })
      .catch(() => {
        if (!active) return;
        setInsightsError('Unable to load latest published insights.');
      })
      .finally(() => {
        if (active) setLoadingInsights(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const featuredSolutions = SOLUTION_CONCEPTS.filter((item) =>
    FEATURED_SOLUTION_CATEGORIES.includes(item.category)
  );

  return (
    <div>
      {/* A. Hero Section */}
      <section className="relative bg-slate-950 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 flex flex-col justify-center"
            >
              <p className="text-sm font-semibold text-blue-400 tracking-tight mb-4">
                NovaTech · Technology That Moves Businesses Forward
              </p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-bold tracking-tight text-white text-balance leading-[1.08]">
                Building the Future Through Intelligent Technology.
              </h1>
              <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                We design and develop intelligent digital solutions that help businesses innovate, scale, and deliver better experiences.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/services"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  <span>Explore Our Services</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-white text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  <span>Let&apos;s Talk</span>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6"
            >
              <div className="h-full min-h-[280px] sm:min-h-[360px] rounded-2xl overflow-hidden border border-slate-800">
                <MediaFrame
                  src={ASSETS.heroPlatform}
                  alt="NovaTech engineering workspace and intelligent digital software architecture"
                  fallbackTitle="NovaTech Engineering Platform"
                  className="w-full h-full"
                  imgClassName="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* B. Trust / Company Introduction Section */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <SectionHeading
                eyebrow="Who We Are"
                title="Technology Built Around Real Business Needs."
                description="NovaTech combines software engineering, intelligent automation, and modern design to help organizations solve practical operational challenges without unnecessary complexity."
              />
            </div>

            <div className="lg:col-span-7 divide-y divide-slate-200 border-t border-b border-slate-200">
              {TRUST_PROPOSITIONS.map((item, idx) => (
                <div key={item.title} className="py-6 first:pt-6 last:pb-6 flex items-start gap-5">
                  <span className="font-mono text-xs font-medium text-blue-700 tabular-nums pt-1">
                    0{idx + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm sm:text-base text-slate-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* C. Services Overview */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <SectionHeading
              eyebrow="Core Capabilities"
              title="Engineering & Digital Services"
              description="Six specialized practices delivering custom software, AI workflow automation, resilient cloud infrastructure, and product design."
            />
            <Link
              to="/services"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0"
            >
              <span>View All Services</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
        </div>
      </section>

      {/* D. Featured Solutions */}
      <section className="py-16 sm:py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <SectionHeading
                  eyebrow="Featured Solutions"
                  title="Demonstration Architectures for Modern Teams"
                  description="Explore how NovaTech structures business automation, governed publishing with BrandOS, customer portals, and data-driven internal platforms."
                />
                <div className="mt-8 rounded-xl overflow-hidden border border-slate-200 aspect-[16/10]">
                  <MediaFrame
                    src={ASSETS.solutionsWorkspace}
                    alt="Enterprise workflow management and analytics platform"
                    fallbackTitle="NovaTech Digital Solutions"
                    className="w-full h-full"
                  />
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/solutions"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
                >
                  <span>Explore Solution Concepts</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {featuredSolutions.map((sol) => (
                <div
                  key={sol.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 flex flex-col justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-blue-700 mb-2">
                      {sol.category}
                    </p>
                    <h3 className="font-display text-lg font-bold text-slate-950 leading-snug">
                      {sol.title}
                    </h3>
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                      {sol.approach}
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-200/80">
                    <p className="text-xs text-slate-500">{sol.outcome}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* E. Why Choose NovaTech? */}
      <section className="py-16 sm:py-24 bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            dark
            eyebrow="Why Choose NovaTech"
            title="Built for Long-Term Operational Trust"
            description="We focus on transparent architecture, verifiable engineering standards, and practical software delivery."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_CHOOSE_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-6"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <Check className="w-4 h-4 text-blue-400 shrink-0" />
                  <h3 className="font-display text-base font-bold text-white">
                    {item.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* F. Featured Insights (Strictly BrandOS-Approved Public Articles) */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <SectionHeading
              eyebrow="Featured Insights"
              title="Perspectives from Our Engineering & Strategy Teams"
              description="Every article published here passes automated verification and authorized approval in BrandOS before appearing publicly."
            />
            <Link
              to="/insights"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0"
            >
              <span>Browse All Insights</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loadingInsights ? (
            <CardSkeleton count={3} />
          ) : insightsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
              {insightsError}
            </div>
          ) : featuredArticles.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-600">
              No published articles are currently featured.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredArticles.map((article) => (
                <BlogCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* G. Call to Action */}
      <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 text-balance">
            Have an Idea? Let&apos;s Build Something Meaningful.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Tell us about your next digital initiative and discover how NovaTech can help turn it into reality.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <span>Start a Conversation</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
