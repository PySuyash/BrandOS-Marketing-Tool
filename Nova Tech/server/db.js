import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { hashPassword } from './auth.js';
import { calculateReadingTime } from './rules.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'novatech-db.json');

export function getDemoPassword() {
  return process.env.DEMO_USER_PASSWORD || 'NovaTechDemo2026!';
}

function buildSeedUsers() {
  const demoPassword = getDemoPassword();
  const now = '2026-10-01T09:00:00.000Z';

  return [
    {
      id: 'usr_customer_demo',
      name: 'Elena Vance',
      email: 'customer@novatech.demo',
      passwordHash: hashPassword(demoPassword),
      websiteRole: 'customer',
      company: 'Meridian Logistics Group',
      department: null,
      brandosRole: null,
      jobTitle: 'VP of Digital Operations',
      notificationPreferences: { productUpdates: true, enquiryReplies: true },
      isActive: true,
      isDemoAccount: true,
      createdAt: now,
    },
    {
      id: 'usr_marketing_demo',
      name: 'Marcus Chen',
      email: 'marketing@novatech.demo',
      passwordHash: hashPassword(demoPassword),
      websiteRole: 'employee',
      company: 'NovaTech',
      department: 'Marketing',
      brandosRole: 'Creator',
      jobTitle: 'Product Marketing Lead',
      notificationPreferences: { productUpdates: true, enquiryReplies: true },
      isActive: true,
      isDemoAccount: true,
      createdAt: now,
    },
    {
      id: 'usr_hr_demo',
      name: 'Priya Nair',
      email: 'hr@novatech.demo',
      passwordHash: hashPassword(demoPassword),
      websiteRole: 'employee',
      company: 'NovaTech',
      department: 'HR',
      brandosRole: 'Reviewer',
      jobTitle: 'People & Compliance Lead',
      notificationPreferences: { productUpdates: true, enquiryReplies: true },
      isActive: true,
      isDemoAccount: true,
      createdAt: now,
    },
    {
      id: 'usr_sales_demo',
      name: 'David Morales',
      email: 'sales@novatech.demo',
      passwordHash: hashPassword(demoPassword),
      websiteRole: 'employee',
      company: 'NovaTech',
      department: 'Sales',
      brandosRole: 'Manager',
      jobTitle: 'Enterprise Solutions Director',
      notificationPreferences: { productUpdates: true, enquiryReplies: true },
      isActive: true,
      isDemoAccount: true,
      createdAt: now,
    },
    {
      id: 'usr_admin_demo',
      name: 'Sophia Alverez',
      email: 'admin@novatech.demo',
      passwordHash: hashPassword(demoPassword),
      websiteRole: 'admin',
      company: 'NovaTech',
      department: 'Executive',
      brandosRole: 'Admin',
      jobTitle: 'VP of Digital Governance',
      notificationPreferences: { productUpdates: true, enquiryReplies: true },
      isActive: true,
      isDemoAccount: true,
      createdAt: now,
    },
  ];
}

function buildSeedInsights() {
  const articles = [
    {
      id: 'ins_ai_workflows',
      slug: 'how-ai-is-transforming-modern-business-workflows',
      title: 'How AI Is Transforming Modern Business Workflows',
      excerpt:
        'Practical patterns for integrating language models and deterministic validation pipelines into enterprise operations without sacrificing auditability.',
      content: [
        'Organizations adopting AI across internal operations are moving past isolated chat experiments toward structured workflow orchestration. Rather than replacing core business software, well-engineered AI components sit directly between document intake, verification checklists, and existing approval queues.',
        'At NovaTech, we structure intelligent automation around three operational principles: deterministic guardrails around business rules, explicit provenance for every generated recommendation, and human-in-the-loop checkpoints for high-impact decisions.',
        'When teams pair automated classification and drafting with clear escalation paths, operational bottlenecks drop without compromising regulatory compliance or brand accuracy. The result is measurable cycle-time reduction paired with verifiable audit logs.',
        'Engineering leaders planning their next automation initiative should start by mapping repetitive handoffs between departments—such as marketing compliance reviews, customer onboarding validation, and technical support triage—and introducing bounded AI steps with strict output schemas.',
      ].join('\n\n'),
      category: 'AI & Automation',
      tags: ['AI', 'Workflow Automation', 'Enterprise', 'Auditability'],
      department: 'Marketing',
      authorName: 'Marcus Chen',
      authorRole: 'Product Marketing Lead',
      coverImage: '/src/assets/images/insight_ai_workflows_1794980382417.jpg',
      readingTime: '5 min read',
      seoTitle: 'How AI Is Transforming Modern Business Workflows | NovaTech Insights',
      seoDescription:
        'Patterns for integrating language models and deterministic validation pipelines into enterprise operations with BrandOS auditability.',
      publishedAt: '2026-11-04T14:30:00.000Z',
      createdAt: '2026-11-02T09:00:00.000Z',
      updatedAt: '2026-11-04T14:30:00.000Z',
      featured: true,
      isFeatured: true,
      isSeedDemo: true,
      status: 'published',
      publicationStatus: 'published',
      approvalStatus: 'approved',
      requiredClaimsVerified: true,
      brandosSubmissionId: 'BOS-2026-101',
      approvedBy: 'David Morales',
      publishedBy: 'Sophia Alverez',
      reviewNotes: 'Internal note: Verified alignment with NovaTech engineering messaging.',
    },
    {
      id: 'ins_scalable_architecture',
      slug: 'why-scalable-software-architecture-matters',
      title: 'Why Scalable Software Architecture Matters',
      excerpt:
        'How modular service boundaries, clear data contracts, and disciplined technical debt management keep digital platforms resilient as user demand grows.',
      content: [
        'Software teams rarely struggle because of their initial launch traffic; they struggle when business requirements double in complexity while core modules remain tightly coupled. Scalable architecture is fundamentally about preserving the speed of safe change.',
        'By separating domain rules from transport layers and interface components, engineering teams can evolve database schemas, introduce partner integrations, and run automated regression suites in milliseconds.',
        'Key architectural practices we emphasize across client engagements include versioned API contracts, stateless request handling, idempotent background jobs, and observability baked into every service boundary from day one.',
        'Investing in clean structural boundaries early prevents costly platform rewrites later and ensures engineering capacity goes toward customer-facing value instead of firefighting.',
      ].join('\n\n'),
      category: 'Software Architecture',
      tags: ['Architecture', 'APIs', 'Modularity', 'Engineering'],
      department: 'Engineering',
      authorName: 'NovaTech Architecture Group',
      authorRole: 'Engineering Practice',
      coverImage: '/src/assets/images/insight_cloud_architecture_1794980382191.jpg',
      readingTime: '6 min read',
      seoTitle: 'Why Scalable Software Architecture Matters | NovaTech Insights',
      seoDescription:
        'Modular service boundaries, versioned API contracts, and domain decoupling keep enterprise platforms resilient as complexity grows.',
      publishedAt: '2026-10-28T10:15:00.000Z',
      createdAt: '2026-10-24T11:00:00.000Z',
      updatedAt: '2026-10-28T10:15:00.000Z',
      featured: true,
      isFeatured: true,
      isSeedDemo: true,
      status: 'published',
      publicationStatus: 'published',
      approvalStatus: 'approved',
      requiredClaimsVerified: true,
      brandosSubmissionId: 'BOS-2026-102',
      approvedBy: 'Sophia Alverez',
      publishedBy: 'Sophia Alverez',
      reviewNotes: 'Internal note: Technical review passed.',
    },
    {
      id: 'ins_user_centered_design',
      slug: 'building-better-digital-experiences-through-user-centered-design',
      title: 'Building Better Digital Experiences Through User-Centered Design',
      excerpt:
        'Why clarity of workflow, accessible contrast, and reduced cognitive friction outperform surface decoration in enterprise web applications.',
      content: [
        'Enterprise software often accumulates complexity because new capabilities are layered onto screens without revisiting how people actually complete their tasks. User-centered product design reverses this trend by organizing interfaces around real operational journeys.',
        'Effective product teams validate navigation depth, form ergonomics, and error recovery states directly with domain practitioners before committing engineering cycles to edge-case features.',
        'Consistent typography, predictable action placement, and immediate system feedback build trust with daily users—whether they are external customers reviewing project updates or internal reviewers inspecting compliance findings.',
        'Design systems succeed when they encode accessibility and clarity by default, allowing product engineers to ship cohesive interfaces rapidly across every touchpoint.',
      ].join('\n\n'),
      category: 'Product Design',
      tags: ['UX Design', 'Accessibility', 'Design Systems'],
      department: 'Marketing',
      authorName: 'Marcus Chen',
      authorRole: 'Product Marketing Lead',
      coverImage: '/src/assets/images/insight_product_design_1794980381990.jpg',
      readingTime: '4 min read',
      seoTitle: 'User-Centered Design in Enterprise Digital Products | NovaTech',
      seoDescription:
        'Clarity of workflow, accessible contrast, and reduced cognitive friction deliver stronger adoption than surface decoration.',
      publishedAt: '2026-10-19T16:00:00.000Z',
      createdAt: '2026-10-15T14:00:00.000Z',
      updatedAt: '2026-10-19T16:00:00.000Z',
      featured: true,
      isFeatured: true,
      isSeedDemo: true,
      status: 'published',
      publicationStatus: 'published',
      approvalStatus: 'approved',
      requiredClaimsVerified: true,
      brandosSubmissionId: 'BOS-2026-103',
      approvedBy: 'Priya Nair',
      publishedBy: 'Sophia Alverez',
      reviewNotes: 'Internal note: Pre-approved demonstration editorial.',
    },
    {
      id: 'ins_cloud_reliability',
      slug: 'designing-cloud-systems-for-predictable-enterprise-reliability',
      title: 'Designing Cloud Systems for Predictable Enterprise Reliability',
      excerpt:
        'Structuring multi-environment deployments, automated health checks, and least-privilege access controls for mission-critical web platforms.',
      content: [
        'Modern cloud infrastructure gives organizations enormous deployment velocity, but speed without operational guardrails introduces avoidable outages and unpredictable costs.',
        'Predictable reliability comes from infrastructure-as-code definitions, immutable release artifacts, automated readiness probes, and explicit separation between public web edges and internal administrative services.',
        'Equally important is access governance: short-lived credentials, strict session boundaries, and server-side validation ensure that convenience for distributed teams never weakens platform security.',
      ].join('\n\n'),
      category: 'Cloud Systems',
      tags: ['Cloud', 'Reliability', 'Security', 'DevOps'],
      department: 'Engineering',
      authorName: 'NovaTech Cloud Practice',
      authorRole: 'Infrastructure Engineering',
      coverImage: '/src/assets/images/hero_novatech_platform_1794980381208.jpg',
      readingTime: '5 min read',
      seoTitle: 'Designing Cloud Systems for Predictable Reliability | NovaTech',
      seoDescription:
        'Multi-environment deployments, health checks, and least-privilege governance for resilient enterprise cloud platforms.',
      publishedAt: '2026-10-11T11:20:00.000Z',
      createdAt: '2026-10-08T10:00:00.000Z',
      updatedAt: '2026-10-11T11:20:00.000Z',
      featured: false,
      isFeatured: false,
      isSeedDemo: true,
      status: 'published',
      publicationStatus: 'published',
      approvalStatus: 'approved',
      requiredClaimsVerified: true,
      brandosSubmissionId: 'BOS-2026-104',
      approvedBy: 'David Morales',
      publishedBy: 'Sophia Alverez',
      reviewNotes: 'Internal note: Approved seed content.',
    },
    {
      id: 'ins_digital_transformation',
      slug: 'practical-digital-transformation-without-operational-disruption',
      title: 'Practical Digital Transformation Without Operational Disruption',
      excerpt:
        'A phased engineering approach to modernizing legacy workflows while keeping day-to-day customer operations uninterrupted.',
      content: [
        'Digital transformation initiatives stall when organizations attempt monolithic cutovers that disrupt active teams. Practical modernization instead introduces clean integration layers around high-value bottlenecks.',
        'By connecting existing records to modern web portals via structured APIs and incremental role-based workflows, businesses deliver immediate visibility to customers and employees while steadily retiring brittle manual spreadsheets.',
        'Clear executive sponsorship, measurable milestone definitions, and shared accountability between engineering and operations turn multi-quarter roadmaps into predictable delivery.',
      ].join('\n\n'),
      category: 'Digital Strategy',
      tags: ['Digital Transformation', 'Modernization', 'Strategy'],
      department: 'Sales',
      authorName: 'David Morales',
      authorRole: 'Enterprise Solutions Director',
      coverImage: '/src/assets/images/solutions_enterprise_workspace_1794980381381.jpg',
      readingTime: '5 min read',
      seoTitle: 'Practical Digital Transformation Without Disruption | NovaTech',
      seoDescription:
        'A phased engineering strategy for modernizing legacy operational workflows without interrupting customer service.',
      publishedAt: '2026-10-03T09:45:00.000Z',
      createdAt: '2026-09-29T09:00:00.000Z',
      updatedAt: '2026-10-03T09:45:00.000Z',
      featured: false,
      isFeatured: false,
      isSeedDemo: true,
      status: 'published',
      publicationStatus: 'published',
      approvalStatus: 'approved',
      requiredClaimsVerified: true,
      brandosSubmissionId: 'BOS-2026-105',
      approvedBy: 'Sophia Alverez',
      publishedBy: 'Sophia Alverez',
      reviewNotes: 'Internal note: Sales advisory demo article.',
    },
    {
      id: 'ins_brand_governance',
      slug: 'why-automated-brand-governance-matters-in-multi-department-publishing',
      title: 'Why Automated Brand Governance Matters in Multi-Department Publishing',
      excerpt:
        'Connecting public corporate publishing with structured internal review workflows so every external claim is verified prior to release.',
      content: [
        'As technology organizations scale across Marketing, HR, Sales, and Engineering, external communications multiply rapidly. Without centralized claim verification and role-based sign-off, unverified statements or off-brand messaging can reach public channels.',
        'NovaTech integrates its public Insights channel directly with BrandOS, our internal governance and review platform. Employees initiate submissions directly from their authenticated session, retaining their exact department and review role.',
        'Before any article reaches the public Insights feed, BrandOS enforces automated policy checks, Claim Ledger verification, manager review, and authorized publication approval—ensuring drafts and pending reviews stay strictly internal.',
      ].join('\n\n'),
      category: 'Brand Governance',
      tags: ['BrandOS', 'Governance', 'Compliance', 'Publishing'],
      department: 'HR',
      authorName: 'Priya Nair',
      authorRole: 'People & Compliance Lead',
      coverImage: '/src/assets/images/insight_ai_workflows_1794980382417.jpg',
      readingTime: '4 min read',
      seoTitle: 'Automated Brand Governance in Multi-Department Publishing | NovaTech',
      seoDescription:
        'How BrandOS integrates Claim Ledger verification and role-based approval before articles publish on NovaTech Insights.',
      publishedAt: '2026-09-25T13:10:00.000Z',
      createdAt: '2026-09-21T11:30:00.000Z',
      updatedAt: '2026-09-25T13:10:00.000Z',
      featured: false,
      isFeatured: false,
      isSeedDemo: true,
      status: 'published',
      publicationStatus: 'published',
      approvalStatus: 'approved',
      requiredClaimsVerified: true,
      brandosSubmissionId: 'BOS-2026-106',
      approvedBy: 'Sophia Alverez',
      publishedBy: 'Sophia Alverez',
      reviewNotes: 'Internal note: Compliance alignment confirmed.',
    },
    {
      id: 'ins_api_boundaries',
      slug: 'zero-trust-api-boundaries-for-customer-and-internal-portals',
      title: 'Zero-Trust API Boundaries for Customer and Internal Portals',
      excerpt:
        'Enforcing strict server-side authorization and tenant separation when public websites and internal employee workflows share infrastructure.',
      content: [
        'Modern corporate web applications increasingly serve two distinct audiences from a single entry domain: external customers exploring services or managing accounts, and internal employees collaborating across governance tools.',
        'Treating interface visibility as security is a common pitfall. Even when internal buttons or dashboards are hidden from non-employees in the UI, every backend endpoint must enforce explicit role and status verification.',
        'At NovaTech, session tokens carry signed identity claims validated on every request, while public content queries filter strictly against verified publication and Claim Ledger state at the database boundary.',
      ].join('\n\n'),
      category: 'Software Architecture',
      tags: ['Security', 'APIs', 'Access Control', 'Governance'],
      department: 'Engineering',
      authorName: 'Sophia Alverez',
      authorRole: 'VP of Digital Governance',
      coverImage: '/src/assets/images/insight_cloud_architecture_1794980382191.jpg',
      readingTime: '4 min read',
      seoTitle: 'Zero-Trust API Boundaries for Customer & Employee Portals | NovaTech',
      seoDescription:
        'Server-side authorization patterns separating public corporate content from internal BrandOS employee governance workflows.',
      publishedAt: '2026-09-18T10:00:00.000Z',
      createdAt: '2026-09-15T10:00:00.000Z',
      updatedAt: '2026-09-18T10:00:00.000Z',
      featured: false,
      isFeatured: false,
      isSeedDemo: true,
      status: 'published',
      publicationStatus: 'published',
      approvalStatus: 'approved',
      requiredClaimsVerified: true,
      brandosSubmissionId: 'BOS-2026-107',
      approvedBy: 'David Morales',
      publishedBy: 'Sophia Alverez',
      reviewNotes: 'Internal note: Security review signed off.',
    },
    {
      id: 'ins_ai_evaluation',
      slug: 'building-measurable-evaluation-harnesses-for-enterprise-ai',
      title: 'Building Measurable Evaluation Harnesses for Enterprise AI',
      excerpt:
        'How deterministic regression checks and domain test suites prevent silent quality drift when updating enterprise prompts and models.',
      content: [
        'Shipping an AI-assisted workflow is straightforward compared to keeping it accurate six months later as underlying prompts, policies, and customer inputs evolve.',
        'Structured evaluation harnesses solve this by pairing curated input fixtures with explicit assertion checks: verifying JSON schema validity, citation grounding, policy adherence, and latency budgets before any workflow change reaches production.',
        'Combining deterministic domain rules with targeted model evaluations gives engineering and compliance teams shared confidence in every release.',
      ].join('\n\n'),
      category: 'AI & Automation',
      tags: ['AI', 'Testing', 'Evaluation', 'Reliability'],
      department: 'Engineering',
      authorName: 'Marcus Chen',
      authorRole: 'Product Marketing Lead',
      coverImage: '/src/assets/images/insight_ai_workflows_1794980382417.jpg',
      readingTime: '4 min read',
      seoTitle: 'Measurable Evaluation Harnesses for Enterprise AI | NovaTech',
      seoDescription:
        'Deterministic regression harnesses and verification gates prevent quality drift in enterprise AI workflows.',
      publishedAt: '2026-09-10T15:00:00.000Z',
      createdAt: '2026-09-07T09:00:00.000Z',
      updatedAt: '2026-09-10T15:00:00.000Z',
      featured: false,
      isFeatured: false,
      isSeedDemo: true,
      status: 'published',
      publicationStatus: 'published',
      approvalStatus: 'approved',
      requiredClaimsVerified: true,
      brandosSubmissionId: 'BOS-2026-108',
      approvedBy: 'Priya Nair',
      publishedBy: 'Sophia Alverez',
      reviewNotes: 'Internal note: Evaluation standards verified.',
    },
    // Internal unapproved BrandOS records (MUST NEVER appear publicly on /api/insights!)
    {
      id: 'ins_internal_draft_1',
      slug: 'q4-enterprise-pricing-announcement-draft',
      title: 'Q4 Enterprise Pricing Announcement (Internal Draft)',
      excerpt: 'Draft announcement pending Claim Ledger verification and Sales Manager approval.',
      content:
        'Internal draft content not approved for public release.\n\nPreliminary pricing tiers and commercial bundle terms remain under internal executive review.',
      category: 'Digital Strategy',
      tags: ['Pricing', 'Internal', 'Commercial'],
      department: 'Marketing',
      authorName: 'Marcus Chen',
      authorRole: 'Product Marketing Lead',
      coverImage: '/src/assets/images/solutions_enterprise_workspace_1794980381381.jpg',
      readingTime: '4 min read',
      seoTitle: 'Q4 Enterprise Pricing Announcement (Internal Draft)',
      seoDescription: 'Internal pricing announcement draft pending BrandOS verification.',
      publishedAt: null,
      createdAt: '2026-11-10T09:00:00.000Z',
      updatedAt: '2026-11-11T16:20:00.000Z',
      featured: false,
      isFeatured: false,
      isSeedDemo: false,
      status: 'draft',
      publicationStatus: 'draft',
      approvalStatus: 'pending',
      requiredClaimsVerified: false,
      brandosSubmissionId: 'BOS-2026-204',
      approvedBy: null,
      publishedBy: null,
      reviewNotes: 'CONFIDENTIAL: Waiting for finance benchmark sign-off.',
    },
    {
      id: 'ins_internal_review_2',
      slug: 'workplace-ai-policy-update-under-review',
      title: '2027 Workplace AI Governance Policy Brief',
      excerpt: 'HR policy communication currently under legal and reviewer verification inside BrandOS.',
      content:
        'Internal policy communication under review.\n\nOutlines acceptable usage guidelines, human sign-off requirements, and regional compliance checkpoints for 2027 engineering teams.',
      category: 'Brand Governance',
      tags: ['Policy', 'Compliance', 'HR'],
      department: 'HR',
      authorName: 'Priya Nair',
      authorRole: 'People & Compliance Lead',
      coverImage: '/src/assets/images/insight_ai_workflows_1794980382417.jpg',
      readingTime: '5 min read',
      seoTitle: '2027 Workplace AI Governance Policy Brief',
      seoDescription: 'Internal HR compliance brief under BrandOS verification.',
      publishedAt: null,
      createdAt: '2026-11-12T10:30:00.000Z',
      updatedAt: '2026-11-14T11:45:00.000Z',
      featured: false,
      isFeatured: false,
      isSeedDemo: false,
      status: 'under_review',
      publicationStatus: 'under_review',
      approvalStatus: 'pending',
      requiredClaimsVerified: false,
      brandosSubmissionId: 'BOS-2026-205',
      approvedBy: null,
      publishedBy: null,
      reviewNotes: 'Reviewer requested explicit regional compliance phrasing.',
    },
    {
      id: 'ins_internal_changes_3',
      slug: 'enterprise-latency-benchmark-changes-requested',
      title: 'Edge Cloud Throughput Study (Changes Requested)',
      excerpt: 'Returned by BrandOS Reviewer for Claim Ledger citation updates.',
      content:
        'Contains unverified throughput claims flagged by BrandOS.\n\nSubmit reproducible benchmark methodology and workload parameters before resubmitting for Manager approval.',
      category: 'Cloud Systems',
      tags: ['Benchmarks', 'Cloud', 'Performance'],
      department: 'Sales',
      authorName: 'David Morales',
      authorRole: 'Enterprise Solutions Director',
      coverImage: '/src/assets/images/insight_cloud_architecture_1794980382191.jpg',
      readingTime: '6 min read',
      seoTitle: 'Edge Cloud Throughput Study (Changes Requested)',
      seoDescription: 'Internal benchmark report awaiting Claim Ledger citations.',
      publishedAt: null,
      createdAt: '2026-11-08T13:15:00.000Z',
      updatedAt: '2026-11-13T17:00:00.000Z',
      featured: false,
      isFeatured: false,
      isSeedDemo: false,
      status: 'changes_requested',
      publicationStatus: 'changes_requested',
      approvalStatus: 'changes_requested',
      requiredClaimsVerified: false,
      brandosSubmissionId: 'BOS-2026-206',
      approvedBy: null,
      publishedBy: null,
      reviewNotes: 'Flagged by BrandOS Claim Ledger: Attach reproducible benchmark methodology.',
    },
  ];

  return articles.map((a) => ({
    ...a,
    summary: a.excerpt,
    readTime: a.readingTime || calculateReadingTime(a.content),
  }));
}

function buildSeedEnquiries() {
  return [
    {
      id: 'enq_seed_1',
      userId: 'usr_customer_demo',
      name: 'Elena Vance',
      email: 'customer@novatech.demo',
      company: 'Meridian Logistics Group',
      subject: 'Customer portal & automated dispatch integration',
      message:
        'We are evaluating a custom web portal to unify shipment visibility and automated partner notifications across our regional hubs.',
      status: 'In Review',
      createdAt: '2026-11-12T15:20:00.000Z',
    },
  ];
}

function buildSeedPublicationHistory() {
  return [
    {
      id: 'pub_hist_1',
      articleId: 'ins_ai_workflows',
      articleTitle: 'How AI Is Transforming Modern Business Workflows',
      brandosSubmissionId: 'BOS-2026-101',
      action: 'Published',
      actorName: 'Sophia Alverez',
      department: 'Marketing',
      timestamp: '2026-11-04T14:30:00.000Z',
    },
    {
      id: 'pub_hist_2',
      articleId: 'ins_scalable_architecture',
      articleTitle: 'Why Scalable Software Architecture Matters',
      brandosSubmissionId: 'BOS-2026-102',
      action: 'Published',
      actorName: 'Sophia Alverez',
      department: 'Engineering',
      timestamp: '2026-10-28T10:15:00.000Z',
    },
    {
      id: 'pub_hist_3',
      articleId: 'ins_brand_governance',
      articleTitle: 'Why Automated Brand Governance Matters in Multi-Department Publishing',
      brandosSubmissionId: 'BOS-2026-106',
      action: 'Published',
      actorName: 'Sophia Alverez',
      department: 'HR',
      timestamp: '2026-09-25T13:10:00.000Z',
    },
  ];
}

let memoryDbCache = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function buildInitialDb() {
  return {
    users: buildSeedUsers(),
    insights: buildSeedInsights(),
    deletedSeedIds: [],
    enquiries: buildSeedEnquiries(),
    publicationHistory: buildSeedPublicationHistory(),
  };
}

function loadRawDb() {
  if (memoryDbCache) {
    return memoryDbCache;
  }
  try {
    ensureDataDir();
    if (!fs.existsSync(DB_FILE)) {
      const initial = buildInitialDb();
      saveRawDb(initial);
      memoryDbCache = initial;
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const loaded = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      deletedSeedIds: Array.isArray(parsed.deletedSeedIds) ? parsed.deletedSeedIds : [],
      enquiries: Array.isArray(parsed.enquiries) ? parsed.enquiries : [],
      publicationHistory: Array.isArray(parsed.publicationHistory) ? parsed.publicationHistory : [],
    };
    memoryDbCache = loaded;
    return loaded;
  } catch {
    const fallback = buildInitialDb();
    memoryDbCache = fallback;
    return fallback;
  }
}

function saveRawDb(db) {
  memoryDbCache = db;
  try {
    ensureDataDir();
    const tmpFile = `${DB_FILE}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.warn('Warning: could not persist DB to disk, operating with in-memory state:', err?.message);
  }
}

export function initDatabase() {
  const db = loadRawDb();
  let changed = false;

  if (!Array.isArray(db.deletedSeedIds)) {
    db.deletedSeedIds = [];
    changed = true;
  }

  const seedUsers = buildSeedUsers();
  for (const seedUser of seedUsers) {
    const existing = db.users.find(
      (u) => u.email.toLowerCase() === seedUser.email.toLowerCase()
    );
    if (!existing) {
      db.users.push(seedUser);
      changed = true;
    } else {
      // Keep demo account credentials and role metadata synchronized with configured demo password
      existing.passwordHash = seedUser.passwordHash;
      existing.isDemoAccount = true;
      if (existing.isActive === undefined) existing.isActive = true;
      changed = true;
    }
  }

  const seedInsights = buildSeedInsights();
  const seedMap = new Map(seedInsights.map((s) => [s.id, s]));
  const existingInsightIds = new Set(db.insights.map((i) => i.id));
  const deletedSet = new Set(db.deletedSeedIds);

  // Backfill new blog fields onto pre-existing persisted articles without clobbering edits
  for (const item of db.insights) {
    const seedMatch = seedMap.get(item.id);
    if (!item.excerpt) {
      item.excerpt = item.summary || seedMatch?.excerpt || '';
      changed = true;
    }
    if (!item.summary) {
      item.summary = item.excerpt;
      changed = true;
    }
    if (!Array.isArray(item.tags)) {
      item.tags = seedMatch?.tags || [];
      changed = true;
    }
    if (!item.readingTime) {
      item.readingTime = item.readTime || calculateReadingTime(item.content);
      changed = true;
    }
    if (!item.readTime) {
      item.readTime = item.readingTime;
      changed = true;
    }
    if (!item.seoTitle) {
      item.seoTitle = seedMatch?.seoTitle || item.title;
      changed = true;
    }
    if (!item.seoDescription) {
      item.seoDescription = seedMatch?.seoDescription || item.excerpt || '';
      changed = true;
    }
    if (item.featured === undefined) {
      item.featured = Boolean(item.isFeatured);
      changed = true;
    }
    if (item.isFeatured === undefined) {
      item.isFeatured = Boolean(item.featured);
      changed = true;
    }
    if (!item.publicationStatus) {
      item.publicationStatus = item.status || 'draft';
      changed = true;
    }
    if (!item.createdAt) {
      item.createdAt = item.publishedAt || seedMatch?.createdAt || new Date().toISOString();
      changed = true;
    }
    if (!item.updatedAt) {
      item.updatedAt = item.publishedAt || item.createdAt;
      changed = true;
    }
  }

  // Only seed articles that have not been explicitly deleted
  for (const seedInsight of seedInsights) {
    if (!existingInsightIds.has(seedInsight.id) && !deletedSet.has(seedInsight.id)) {
      db.insights.push(seedInsight);
      changed = true;
    }
  }

  if (db.enquiries.length === 0) {
    db.enquiries.push(...buildSeedEnquiries());
    changed = true;
  }

  if (db.publicationHistory.length === 0) {
    db.publicationHistory.push(...buildSeedPublicationHistory());
    changed = true;
  }

  if (changed) {
    saveRawDb(db);
  }
  return db;
}

export function readDb() {
  return loadRawDb();
}

export function updateDb(mutator) {
  const db = loadRawDb();
  const result = mutator(db);
  saveRawDb(db);
  return result;
}
