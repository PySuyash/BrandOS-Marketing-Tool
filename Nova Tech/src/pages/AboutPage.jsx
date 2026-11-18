import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ASSETS, TEAM_PROFILES } from '../data/companyData.js';
import MediaFrame from '../components/MediaFrame.jsx';
import SectionHeading from '../components/SectionHeading.jsx';

const VALUES = [
  {
    title: 'Clarity Before Complexity',
    description:
      'We define business workflows and operational constraints clearly before selecting frameworks or scaling infrastructure.',
  },
  {
    title: 'Verifiable Quality',
    description:
      'Automated checks, clean modular tests, and structured review gates protect reliability across both software and public communications.',
  },
  {
    title: 'Accountable Ownership',
    description:
      'Every product, architecture blueprint, and client engagement is backed by clear engineering responsibility.',
  },
  {
    title: 'Respect for Users',
    description:
      'We design accessible, legible software interfaces that respect the time and focus of everyday operators.',
  },
];

const WORK_STEPS = [
  {
    step: '01',
    title: 'Operational Discovery',
    description:
      'We map your existing business processes, integration points, and user roles to identify the highest-impact technical improvements.',
  },
  {
    step: '02',
    title: 'Architecture & Interface Blueprint',
    description:
      'Our engineers and designers establish clear data schemas, security boundaries, and interactive prototypes before full build-out.',
  },
  {
    step: '03',
    title: 'Iterative Delivery & Verification',
    description:
      'Capabilities ship in testable increments backed by unit tests, role-based validation, and stakeholder walkthroughs.',
  },
  {
    step: '04',
    title: 'Governed Launch & Evolution',
    description:
      'Post-launch telemetry, documentation, and internal governance workflows ensure systems stay reliable as teams grow.',
  },
];

export default function AboutPage() {
  return (
    <div>
      {/* 1. About NovaTech */}
      <section className="bg-slate-950 text-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-sm font-semibold text-blue-400 mb-3">About NovaTech</p>
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-balance leading-tight">
                Building Intelligent Digital Experiences That Help Businesses Grow.
              </h1>
              <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed">
                NovaTech is a technology company focused on building modern digital products, intelligent software solutions, and scalable digital experiences. We help businesses transform their ideas into practical technology solutions through software engineering, AI-powered applications, and digital innovation.
              </p>
            </div>
            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] rounded-2xl overflow-hidden border border-slate-800">
                <MediaFrame
                  src={ASSETS.aiWorkflows}
                  alt="NovaTech engineering and product collaboration"
                  fallbackTitle="NovaTech Team Collaboration"
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Mission & 3. Vision */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8">
            <p className="text-xs font-semibold text-blue-700 mb-3">Our Mission</p>
            <h2 className="font-display text-2xl font-bold text-slate-950 leading-snug">
              To make useful technology accessible through thoughtful engineering and intelligent digital solutions.
            </h2>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8">
            <p className="text-xs font-semibold text-blue-700 mb-3">Our Vision</p>
            <h2 className="font-display text-2xl font-bold text-slate-950 leading-snug">
              To help businesses build a smarter, more connected digital future.
            </h2>
          </div>
        </div>
      </section>

      {/* 4. Our Values */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Our Values"
            title="Principles Guiding Every Engagement"
          />
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-xl border border-slate-200 p-6 sm:p-7">
                <h3 className="font-display text-lg font-bold text-slate-950">{v.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. How We Work */}
      <section className="py-16 sm:py-20 bg-slate-50 border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="How We Work"
            title="Structured Delivery From Discovery to Production"
          />
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WORK_STEPS.map((item) => (
              <div key={item.step} className="rounded-xl border border-slate-200 bg-white p-6">
                <span className="font-mono text-sm font-semibold text-blue-700 tabular-nums">
                  {item.step}
                </span>
                <h3 className="mt-3 font-display text-lg font-bold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Our Approach to Innovation & BrandOS Governance */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <SectionHeading
              eyebrow="Our Approach to Innovation"
              title="Responsible AI Backed by Governance"
              description="Innovation at NovaTech pairs intelligent automation with clear accountability. Internally, we operate BrandOS—an AI-powered brand governance and content approval platform—to ensure every public insight we share undergoes automated verification and human manager review before publication."
            />
            <div className="mt-6">
              <Link
                to="/insights"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                <span>Read Verified Insights</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-[16/10]">
              <MediaFrame
                src={ASSETS.cloudArchitecture}
                alt="NovaTech cloud systems and governance infrastructure"
                fallbackTitle="NovaTech Infrastructure"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sample Team Section (Fictional Demonstration Profiles) */}
      <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Leadership Directory"
            title="Sample Demonstration Team Profiles"
            description="Fictional demonstration team profiles representing how NovaTech departments collaborate across engineering, marketing, compliance, and client solutions."
          />

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM_PROFILES.map((member) => (
              <div
                key={member.name}
                className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="w-11 h-11 rounded-lg bg-slate-950 text-white font-display font-bold text-sm flex items-center justify-center mb-4">
                    {member.name
                      .split(' ')
                      .map((p) => p[0])
                      .join('')}
                  </div>
                  <p className="text-xs font-semibold text-blue-700 mb-1">
                    {member.department} · Sample Profile
                  </p>
                  <h3 className="font-display text-lg font-bold text-slate-950">
                    {member.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{member.role}</p>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Call to Action */}
      <section className="py-16 bg-slate-950 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Ready to Discuss Your Next Initiative?
          </h2>
          <p className="mt-3 text-slate-300">
            Connect with our team to explore custom software, AI workflow automation, or platform modernization.
          </p>
          <div className="mt-7">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              <span>Contact NovaTech</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
