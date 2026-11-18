import 'dotenv/config';
import { eq, like } from 'drizzle-orm';
import { db } from './index.js';
import {
  approvals,
  auditLogs,
  claims,
  comments,
  departments,
  findings,
  guidelines,
  knowledgeItems,
  submissions,
  users,
  versions,
} from './schema.js';
import { hashPassword } from '../server/auth.js';

export function getDemoPassword() {
  return process.env.DEMO_USER_PASSWORD || 'BrandOS@2026';
}

export async function seedDatabaseIfEmpty() {
  const existingDepts = await db.select().from(departments).limit(1);
  if (existingDepts.length > 0) {
    const syncedHash = await hashPassword(getDemoPassword());
    await db
      .update(users)
      .set({ passwordHash: syncedHash })
      .where(like(users.email, '%@brandos.demo'));
    return {
      seeded: false,
      message: 'Database already contains department records; synced demo credentials.',
    };
  }

  console.log(
    'Seeding BrandOS PostgreSQL database with departments, users, guidelines, knowledge base, and sample submissions...'
  );

  const insertedDepts = await db
    .insert(departments)
    .values([
      {
        name: 'Marketing',
        slug: 'marketing',
        description:
          'External brand campaigns, social posts, product launches, digital ads, and blog articles.',
        toneProfile:
          'Engaging, clear, creative, and persuasive without unsupported exaggeration.',
        requiredMessaging:
          'Include a clear, honest customer call-to-action or product guidance without unverified superlatives.',
      },
      {
        name: 'Human Resources (HR)',
        slug: 'hr',
        description:
          'Internal announcements, employee policies, benefits guides, and recruitment communications.',
        toneProfile: 'Respectful, inclusive, professional, clear, and empathetic.',
        requiredMessaging:
          'Reference the People Portal or HR Partner for individualized questions and accommodations.',
      },
      {
        name: 'Sales',
        slug: 'sales',
        description:
          'Customer proposals, outbound outreach, pricing sheets, and commercial SLA commitments.',
        toneProfile:
          'Confident, customer-focused, helpful, honest, and evidence-based.',
        requiredMessaging:
          'Cite contractual SLA boundaries or approved enterprise tier terms when quoting commercial guarantees.',
      },
    ])
    .returning();

  const deptBySlug = new Map(insertedDepts.map((d) => [d.slug, d]));
  const mkt = deptBySlug.get('marketing');
  const hr = deptBySlug.get('hr');
  const sales = deptBySlug.get('sales');

  const demoPasswordHash = await hashPassword(getDemoPassword());
  const insertedUsers = await db
    .insert(users)
    .values([
      {
        uid: 'demo-admin-01',
        name: 'Aarav Mehta',
        email: 'admin@brandos.demo',
        passwordHash: demoPasswordHash,
        departmentId: null,
        role: 'Admin',
        title: 'Head of Brand Governance',
      },
      {
        uid: 'demo-creator-mkt-01',
        name: 'Maya Lin',
        email: 'creator.marketing@brandos.demo',
        passwordHash: demoPasswordHash,
        departmentId: mkt.id,
        role: 'Creator',
        title: 'Senior Content Strategist',
      },
      {
        uid: 'demo-manager-mkt-01',
        name: 'Elena Rostova',
        email: 'manager.marketing@brandos.demo',
        passwordHash: demoPasswordHash,
        departmentId: mkt.id,
        role: 'Manager',
        title: 'Director of Brand Marketing',
      },
      {
        uid: 'demo-creator-hr-01',
        name: 'Jordan Patel',
        email: 'creator.hr@brandos.demo',
        passwordHash: demoPasswordHash,
        departmentId: hr.id,
        role: 'Creator',
        title: 'People Communications Specialist',
      },
      {
        uid: 'demo-manager-hr-01',
        name: 'Priya Nair',
        email: 'manager.hr@brandos.demo',
        passwordHash: demoPasswordHash,
        departmentId: hr.id,
        role: 'Manager',
        title: 'VP of People Operations',
      },
      {
        uid: 'demo-creator-sales-01',
        name: 'Liam Vance',
        email: 'creator.sales@brandos.demo',
        passwordHash: demoPasswordHash,
        departmentId: sales.id,
        role: 'Creator',
        title: 'Enterprise Account Executive',
      },
      {
        uid: 'demo-reviewer-01',
        name: 'Dr. Marcus Chen',
        email: 'reviewer@brandos.demo',
        passwordHash: demoPasswordHash,
        departmentId: null,
        role: 'Reviewer',
        title: 'Lead Claims & Compliance Reviewer',
      },
    ])
    .returning();

  const userByEmail = new Map(insertedUsers.map((u) => [u.email, u]));
  const mktCreator = userByEmail.get('creator.marketing@brandos.demo');
  const mktManager = userByEmail.get('manager.marketing@brandos.demo');
  const hrCreator = userByEmail.get('creator.hr@brandos.demo');
  const hrManager = userByEmail.get('manager.hr@brandos.demo');
  const salesCreator = userByEmail.get('creator.sales@brandos.demo');
  const reviewer = userByEmail.get('reviewer@brandos.demo');

  const insertedGuidelines = await db
    .insert(guidelines)
    .values([
      {
        departmentId: mkt.id,
        ruleCode: 'MKT-RULE-01',
        title: 'Prohibit Absolute Guarantee Claims',
        description:
          'Marketing copy must not use "guaranteed" or imply unconditional outcomes unless backed by a documented warranty fact.',
        ruleType: 'banned_word',
        severity: 'Blocker',
        bannedTerm: 'guaranteed',
        preferredTerm: 'designed to help',
        status: 'Active',
      },
      {
        departmentId: mkt.id,
        ruleCode: 'MKT-RULE-02',
        title: 'Avoid Hyperbolic Cure or Miracle Terms',
        description:
          'Avoid unsubstantiated sensational terms like "miracle" in product and campaign copy.',
        ruleType: 'banned_word',
        severity: 'Major',
        bannedTerm: 'miracle',
        preferredTerm: 'effective',
        status: 'Active',
      },
      {
        departmentId: mkt.id,
        ruleCode: 'MKT-RULE-03',
        title: 'Replace "Cheap" with Value-Focused Language',
        description:
          'Use "affordable" or "accessible" instead of "cheap" to maintain premium brand positioning.',
        ruleType: 'preferred_word',
        severity: 'Minor',
        bannedTerm: 'cheap',
        preferredTerm: 'affordable',
        status: 'Active',
      },
      {
        departmentId: mkt.id,
        ruleCode: 'MKT-RULE-04',
        title: 'Use Consultative CTA Instead of "Buy Now"',
        description:
          'Prefer inviting, helpful calls-to-action such as "explore options" instead of transactional "buy now" in editorial posts.',
        ruleType: 'preferred_word',
        severity: 'Minor',
        bannedTerm: 'buy now',
        preferredTerm: 'explore options',
        status: 'Active',
      },
      {
        departmentId: mkt.id,
        ruleCode: 'MKT-RULE-05',
        title: 'Marketing Tone Alignment',
        description:
          'Copy must sound engaging, clear, creative, and persuasive without unsupported exaggeration or pressure tactics.',
        ruleType: 'tone',
        severity: 'Major',
        toneProfile:
          'Engaging, clear, creative, persuasive without unsupported exaggeration',
        status: 'Active',
      },
      {
        departmentId: mkt.id,
        ruleCode: 'MKT-RULE-06',
        title: 'Marketing Sentence Clarity & Brevity',
        description:
          'Sentences exceeding 28 words dilute mobile readability and social engagement. Break long sentences into crisp statements.',
        ruleType: 'readability',
        severity: 'Minor',
        status: 'Active',
      },
      {
        departmentId: mkt.id,
        ruleCode: 'MKT-RULE-07',
        title: 'Include Customer Next-Step Guidance',
        description:
          'External campaigns should include a clear next step or educational resource link (e.g., "Learn more", "Explore", "Read the guide").',
        ruleType: 'required_messaging',
        severity: 'Minor',
        requiredPhrase: 'explore|learn more|guide|visit|discover',
        status: 'Active',
      },
      {
        departmentId: mkt.id,
        ruleCode: 'MKT-RULE-08',
        title: 'Image Alt-Text Description Required',
        description:
          'Image placeholders or markdown image tags in submitted content must include descriptive alt text.',
        ruleType: 'accessibility',
        severity: 'Major',
        status: 'Active',
      },
      {
        departmentId: hr.id,
        ruleCode: 'HR-RULE-01',
        title: 'Use Gender-Inclusive Group Address',
        description:
          'Do not use "guys" in internal announcements or team communications. Use inclusive alternatives like "team" or "everyone".',
        ruleType: 'banned_word',
        severity: 'Blocker',
        bannedTerm: 'guys',
        preferredTerm: 'everyone',
        status: 'Active',
      },
      {
        departmentId: hr.id,
        ruleCode: 'HR-RULE-02',
        title: 'Prohibit Coercive Scheduling Terms',
        description:
          'Do not write "mandatory overtime" in internal memos without citing legal/HR policy exceptions.',
        ruleType: 'banned_word',
        severity: 'Blocker',
        bannedTerm: 'mandatory overtime',
        preferredTerm: 'scheduled peak coverage',
        status: 'Active',
      },
      {
        departmentId: hr.id,
        ruleCode: 'HR-RULE-03',
        title: 'Remove Exclusionary Hiring Jargon',
        description:
          'Avoid terms like "rockstar" or "ninja" in HR and talent messaging.',
        ruleType: 'banned_word',
        severity: 'Major',
        bannedTerm: 'rockstar',
        preferredTerm: 'experienced specialist',
        status: 'Active',
      },
      {
        departmentId: hr.id,
        ruleCode: 'HR-RULE-04',
        title: 'Clarify Leave Terms Accurately',
        description:
          'Never describe paid time off as "unlimited" when employees have a defined annual leave allowance.',
        ruleType: 'preferred_word',
        severity: 'Major',
        bannedTerm: 'unlimited',
        preferredTerm: 'flexible (per annual leave policy)',
        status: 'Active',
      },
      {
        departmentId: hr.id,
        ruleCode: 'HR-RULE-05',
        title: 'HR Empathetic & Inclusive Tone',
        description:
          'Internal communications must remain respectful, inclusive, professional, clear, and empathetic.',
        ruleType: 'tone',
        severity: 'Major',
        toneProfile:
          'Respectful, inclusive, professional, clear, and empathetic',
        status: 'Active',
      },
      {
        departmentId: hr.id,
        ruleCode: 'HR-RULE-06',
        title: 'Include People Portal Reference',
        description:
          'Policy and benefits updates must direct employees to the People Portal or their HR Partner for accommodations.',
        ruleType: 'required_messaging',
        severity: 'Major',
        requiredPhrase: 'People Portal|HR Partner',
        status: 'Active',
      },
      {
        departmentId: hr.id,
        ruleCode: 'HR-RULE-07',
        title: 'Plain-Language Policy Clarity',
        description:
          'Avoid dense, multi-clause sentences over 28 words in employee policy communications.',
        ruleType: 'readability',
        severity: 'Minor',
        status: 'Active',
      },
      {
        departmentId: sales.id,
        ruleCode: 'SLS-RULE-01',
        title: 'No Uncontracted 100% Uptime Guarantees',
        description:
          'Sales proposals must not promise "100% uptime". Cite the approved 99.9% contractual SLA.',
        ruleType: 'banned_word',
        severity: 'Blocker',
        bannedTerm: '100% uptime',
        preferredTerm: '99.9% contractual SLA uptime',
        status: 'Active',
      },
      {
        departmentId: sales.id,
        ruleCode: 'SLS-RULE-02',
        title: 'Avoid Absolute "Risk-Free" Language',
        description:
          'Commercial outreach should avoid promising "risk-free" deployment; reference standard onboarding protections.',
        ruleType: 'banned_word',
        severity: 'Major',
        bannedTerm: 'risk-free',
        preferredTerm: 'supported by our standard onboarding SLA',
        status: 'Active',
      },
      {
        departmentId: sales.id,
        ruleCode: 'SLS-RULE-03',
        title: 'Replace "Cheap" with ROI Language',
        description:
          'Frame pricing in terms of "cost-effective" value and total cost of ownership.',
        ruleType: 'preferred_word',
        severity: 'Minor',
        bannedTerm: 'cheap',
        preferredTerm: 'cost-effective',
        status: 'Active',
      },
      {
        departmentId: sales.id,
        ruleCode: 'SLS-RULE-04',
        title: 'Sales Evidence-Based Tone',
        description:
          'Communication must be confident, customer-focused, helpful, honest, and strictly grounded in approved specs.',
        ruleType: 'tone',
        severity: 'Major',
        toneProfile:
          'Confident, customer-focused, helpful, honest, and evidence-based',
        status: 'Active',
      },
      {
        departmentId: sales.id,
        ruleCode: 'SLS-RULE-05',
        title: 'Reference Official SLA or Tier Terms',
        description:
          'Proposals quoting commercial commitments should reference SLA or Enterprise tier terms.',
        ruleType: 'required_messaging',
        severity: 'Minor',
        requiredPhrase: 'SLA|Enterprise|terms|agreement',
        status: 'Active',
      },
      {
        departmentId: sales.id,
        ruleCode: 'SLS-RULE-06',
        title: 'Executive Proposal Scannability',
        description:
          'Keep buyer-facing sentences crisp and free of repetitive filler.',
        ruleType: 'readability',
        severity: 'Minor',
        status: 'Active',
      },
    ])
    .returning();

  const ruleByCode = new Map(insertedGuidelines.map((g) => [g.ruleCode, g]));

  const insertedFacts = await db
    .insert(knowledgeItems)
    .values([
      {
        departmentId: mkt.id,
        factCode: 'MKT-FACT-01',
        title: 'Standard Order Delivery Window',
        content:
          'Standard delivery takes 3–5 business days across all supported metro and tier-2 cities.',
        factType: 'delivery',
        owner: 'VP of Logistics',
        expiryDate: '2027-06-30',
        status: 'Approved',
      },
      {
        departmentId: mkt.id,
        factCode: 'MKT-FACT-02',
        title: 'Starter Garden Kit Official Pricing',
        content:
          'The Starter Garden Kit is priced at ₹1,499 and includes a 30-day return window for unopened items.',
        factType: 'pricing',
        owner: 'Head of Product Pricing',
        expiryDate: '2027-03-31',
        status: 'Approved',
      },
      {
        departmentId: mkt.id,
        factCode: 'MKT-FACT-03',
        title: '2025 Soil-Health Adoption Metric',
        content:
          '42,000+ home gardeners completed our seasonal soil-health checklist in 2025.',
        factType: 'metric',
        owner: 'Growth Analytics Lead',
        expiryDate: '2026-12-31',
        status: 'Approved',
      },
      {
        departmentId: mkt.id,
        factCode: 'MKT-FACT-04',
        title: 'Organic Coco-Peat Moisture Retention',
        content:
          'Our organic coco-peat blend retains up to 35% more moisture than standard topsoil in controlled greenhouse trials.',
        factType: 'product_feature',
        owner: 'Agronomy R&D',
        expiryDate: '2027-09-01',
        status: 'Approved',
      },
      {
        departmentId: hr.id,
        factCode: 'HR-FACT-01',
        title: 'Annual Paid Leave Entitlement',
        content:
          'Full-time employees receive 24 days of paid annual leave plus 12 public holidays per calendar year.',
        factType: 'employment_benefit',
        owner: 'Total Rewards Director',
        expiryDate: '2027-12-31',
        status: 'Approved',
      },
      {
        departmentId: hr.id,
        factCode: 'HR-FACT-02',
        title: 'Hybrid Work Attendance Policy',
        content:
          'Hybrid employees work on-site 3 days per week (Tuesday through Thursday) unless an accommodation is approved via the People Portal.',
        factType: 'policy',
        owner: 'VP of People Operations',
        expiryDate: '2027-06-30',
        status: 'Approved',
      },
      {
        departmentId: hr.id,
        factCode: 'HR-FACT-03',
        title: 'Annual Learning & Wellness Stipend',
        content:
          'Annual learning and wellness reimbursement is capped at ₹35,000 per employee per fiscal year.',
        factType: 'employment_benefit',
        owner: 'HR Finance Partner',
        expiryDate: '2027-03-31',
        status: 'Approved',
      },
      {
        departmentId: sales.id,
        factCode: 'SLS-FACT-01',
        title: 'Enterprise Uptime SLA & Support Tier',
        content:
          'Enterprise subscriptions include a 99.9% uptime SLA and a 4-hour priority support response time.',
        factType: 'policy',
        owner: 'VP of Customer Engineering',
        expiryDate: '2027-12-31',
        status: 'Approved',
      },
      {
        departmentId: sales.id,
        factCode: 'SLS-FACT-02',
        title: 'Enterprise Volume Discount Floor',
        content:
          'Annual enterprise volume discounts start at 15% for commitments above 250 seats.',
        factType: 'pricing',
        owner: 'Revenue Operations',
        expiryDate: '2027-04-30',
        status: 'Approved',
      },
      {
        departmentId: sales.id,
        factCode: 'SLS-FACT-03',
        title: 'Standard Enterprise Onboarding Timeline',
        content:
          'Standard enterprise onboarding takes 14 business days from contract signature.',
        factType: 'delivery',
        owner: 'Implementation Lead',
        expiryDate: '2027-08-31',
        status: 'Approved',
      },
    ])
    .returning();

  const factByCode = new Map(insertedFacts.map((f) => [f.factCode, f]));

  const [sub1] = await db
    .insert(submissions)
    .values({
      title: 'Spring Urban Gardening Campaign Launch',
      creatorId: mktCreator.id,
      departmentId: mkt.id,
      contentType: 'Social media post',
      channel: 'LinkedIn',
      status: 'Resubmitted',
      currentVersion: 3,
      aiModeUsed: 'deterministic_fallback',
    })
    .returning();

  const [sub1v1] = await db
    .insert(versions)
    .values({
      submissionId: sub1.id,
      versionNumber: 1,
      content:
        "Join India's No. 1 trusted gardening platform for cheap starter planters and guaranteed blooming results every week. Get your order delivered within 2 hours anywhere in the city! Explore our spring collection today.",
      createdBy: mktCreator.id,
      changeSummary: 'Initial submission.',
    })
    .returning();

  const [sub1v2] = await db
    .insert(versions)
    .values({
      submissionId: sub1.id,
      versionNumber: 2,
      content:
        "Join India's No. 1 trusted gardening platform for affordable starter planters designed to help your balcony garden thrive. Get your order delivered within 2 hours anywhere in the city! Explore our spring collection today.",
      createdBy: mktCreator.id,
      changeSummary:
        'Banned and preferred words corrected ("cheap" -> "affordable", "guaranteed" removed).',
    })
    .returning();

  const [sub1v3] = await db
    .insert(versions)
    .values({
      submissionId: sub1.id,
      versionNumber: 3,
      content:
        'Discover urban gardening solutions trusted by 42,000+ home gardeners for affordable starter planters designed to help your balcony garden thrive. Standard delivery takes 3–5 business days across all supported metro cities. Explore our spring guide today.',
      createdBy: mktCreator.id,
      changeSummary:
        'Unverified ranking and conflicting 2-hour delivery claim revised using approved Marketing facts.',
    })
    .returning();

  await db.insert(findings).values([
    {
      submissionId: sub1.id,
      versionId: sub1v1.id,
      ruleId: ruleByCode.get('MKT-RULE-03').id,
      ruleCode: 'MKT-RULE-03',
      findingCode: 'FND-MKT-101',
      category: 'preferred_word',
      highlightedText: 'cheap',
      explanation:
        'The term "cheap" conflicts with Marketing brand positioning guidelines.',
      severity: 'Minor',
      confidence: 100,
      evidence:
        'Rule MKT-RULE-03: Replace "cheap" with "affordable" to maintain brand positioning.',
      suggestion: 'affordable',
      unchangedNote: 'Your pricing value proposition remains intact.',
      status: 'Addressed',
      addressedBy: mktCreator.id,
    },
    {
      submissionId: sub1.id,
      versionId: sub1v1.id,
      ruleId: ruleByCode.get('MKT-RULE-01').id,
      ruleCode: 'MKT-RULE-01',
      findingCode: 'FND-MKT-102',
      category: 'banned_word',
      highlightedText: 'guaranteed',
      explanation:
        'Marketing rule MKT-RULE-01 prohibits absolute outcome guarantees.',
      severity: 'Blocker',
      confidence: 100,
      evidence:
        'Rule MKT-RULE-01: Marketing copy must not use "guaranteed" without a documented warranty.',
      suggestion: 'designed to help',
      unchangedNote:
        'Your product benefit message remains clear without legal risk.',
      status: 'Addressed',
      addressedBy: mktCreator.id,
    },
  ]);

  await db.insert(claims).values([
    {
      submissionId: sub1.id,
      versionId: sub1v1.id,
      claimText: "India's No. 1 trusted gardening platform",
      category: 'ranking',
      verdict: 'UNVERIFIED',
      sourceId: null,
      sourceQuote: null,
      confidence: 35,
      explanation:
        'No approved ranking or "#1" market-share evidence exists in the Marketing knowledge base.',
      suggestion:
        'Discover gardening solutions designed to support your everyday needs',
      reviewerStatus: 'Evidence Insufficient',
      reviewerNote: 'No third-party award citation uploaded for 2026.',
      verifiedBy: reviewer.id,
      verifiedAt: new Date(),
    },
    {
      submissionId: sub1.id,
      versionId: sub1v1.id,
      claimText: 'Get your order delivered within 2 hours',
      category: 'delivery',
      verdict: 'CONFLICTS',
      sourceId: factByCode.get('MKT-FACT-01').id,
      sourceQuote:
        'Standard delivery takes 3–5 business days across all supported metro and tier-2 cities.',
      confidence: 98,
      explanation:
        'Promising 2-hour delivery directly contradicts MKT-FACT-01 (3–5 business days).',
      suggestion:
        'Standard delivery takes 3–5 business days across all supported metro cities',
      reviewerStatus: 'Verified',
      reviewerNote: 'Confirmed contradiction against Logistics SLA MKT-FACT-01.',
      verifiedBy: reviewer.id,
      verifiedAt: new Date(),
    },
    {
      submissionId: sub1.id,
      versionId: sub1v3.id,
      claimText: 'trusted by 42,000+ home gardeners',
      category: 'statistic',
      verdict: 'SUPPORTED',
      sourceId: factByCode.get('MKT-FACT-03').id,
      sourceQuote:
        '42,000+ home gardeners completed our seasonal soil-health checklist in 2025.',
      confidence: 94,
      explanation: 'Matches MKT-FACT-03 owned by Growth Analytics Lead.',
      suggestion: null,
      reviewerStatus: 'Pending Review',
    },
    {
      submissionId: sub1.id,
      versionId: sub1v3.id,
      claimText:
        'Standard delivery takes 3–5 business days across all supported metro cities',
      category: 'delivery',
      verdict: 'SUPPORTED',
      sourceId: factByCode.get('MKT-FACT-01').id,
      sourceQuote:
        'Standard delivery takes 3–5 business days across all supported metro and tier-2 cities.',
      confidence: 99,
      explanation: 'Accurately reflects MKT-FACT-01 owned by VP of Logistics.',
      suggestion: null,
      reviewerStatus: 'Pending Review',
    },
  ]);

  await db.insert(comments).values([
    {
      submissionId: sub1.id,
      versionId: sub1v1.id,
      userId: mktManager.id,
      commentText:
        'Please replace the 2-hour delivery promise with our official 3–5 business day logistics window and remove the #1 ranking claim.',
    },
    {
      submissionId: sub1.id,
      versionId: sub1v3.id,
      userId: mktCreator.id,
      commentText:
        'Updated copy in Version 3 to cite our 42,000+ gardeners metric and official 3–5 business day delivery fact. Ready for final sign-off.',
    },
  ]);

  await db.insert(approvals).values([
    {
      submissionId: sub1.id,
      versionId: sub1v2.id,
      reviewerId: mktManager.id,
      decision: 'Changes Requested',
      reason:
        'Banned words were fixed in v2, but the conflicting 2-hour delivery claim and unverified #1 ranking remain.',
    },
  ]);

  const [sub2] = await db
    .insert(submissions)
    .values({
      title: 'Seasonal Soil-Health Guide Blog Post',
      creatorId: mktCreator.id,
      departmentId: mkt.id,
      contentType: 'Blog article',
      channel: 'Website',
      status: 'Approved',
      currentVersion: 1,
      aiModeUsed: 'deterministic_fallback',
    })
    .returning();

  const [sub2v1] = await db
    .insert(versions)
    .values({
      submissionId: sub2.id,
      versionNumber: 1,
      content:
        'Preparing raised beds for spring starts with balanced moisture retention. Our organic coco-peat blend retains up to 35% more moisture than standard topsoil in controlled greenhouse trials. Over 42,000+ home gardeners completed our seasonal soil-health checklist in 2025. Explore the full seasonal guide on our website.',
      createdBy: mktCreator.id,
      changeSummary: 'Initial submission.',
    })
    .returning();

  await db.insert(claims).values([
    {
      submissionId: sub2.id,
      versionId: sub2v1.id,
      claimText: 'retains up to 35% more moisture than standard topsoil',
      category: 'percentage',
      verdict: 'SUPPORTED',
      sourceId: factByCode.get('MKT-FACT-04').id,
      sourceQuote:
        'Our organic coco-peat blend retains up to 35% more moisture than standard topsoil in controlled greenhouse trials.',
      confidence: 97,
      explanation: 'Directly supported by Agronomy R&D fact MKT-FACT-04.',
      reviewerStatus: 'Verified',
      verifiedBy: reviewer.id,
      verifiedAt: new Date(),
    },
    {
      submissionId: sub2.id,
      versionId: sub2v1.id,
      claimText:
        '42,000+ home gardeners completed our seasonal soil-health checklist in 2025',
      category: 'statistic',
      verdict: 'SUPPORTED',
      sourceId: factByCode.get('MKT-FACT-03').id,
      sourceQuote:
        '42,000+ home gardeners completed our seasonal soil-health checklist in 2025.',
      confidence: 98,
      explanation: 'Directly supported by Growth Analytics fact MKT-FACT-03.',
      reviewerStatus: 'Verified',
      verifiedBy: reviewer.id,
      verifiedAt: new Date(),
    },
  ]);

  await db.insert(approvals).values([
    {
      submissionId: sub2.id,
      versionId: sub2v1.id,
      reviewerId: mktManager.id,
      decision: 'Approved',
      reason:
        'All claims verified against Marketing knowledge base and tone guidelines fully satisfied.',
    },
  ]);

  const [sub3] = await db
    .insert(submissions)
    .values({
      title: 'Q4 Hybrid Schedule & Leave Update',
      creatorId: hrCreator.id,
      departmentId: hr.id,
      contentType: 'Internal announcement',
      channel: 'Internal communication',
      status: 'Changes Requested',
      currentVersion: 1,
      aiModeUsed: 'deterministic_fallback',
    })
    .returning();

  const [sub3v1] = await db
    .insert(versions)
    .values({
      submissionId: sub3.id,
      versionNumber: 1,
      content:
        'Hey guys, quick update for Q4: full-time employees now enjoy unlimited paid annual leave and only need to come to the office 1 day per week.',
      createdBy: hrCreator.id,
      changeSummary: 'Initial submission.',
    })
    .returning();

  await db.insert(findings).values([
    {
      submissionId: sub3.id,
      versionId: sub3v1.id,
      ruleId: ruleByCode.get('HR-RULE-01').id,
      ruleCode: 'HR-RULE-01',
      findingCode: 'FND-HR-201',
      category: 'banned_word',
      highlightedText: 'guys',
      explanation:
        'HR rule HR-RULE-01 prohibits gendered group address "guys" in internal employee communications.',
      severity: 'Blocker',
      confidence: 100,
      evidence:
        'Rule HR-RULE-01: Use inclusive alternatives like "team" or "everyone".',
      suggestion: 'everyone',
      unchangedNote: 'Your friendly opening greeting remains welcoming.',
      status: 'Open',
    },
    {
      submissionId: sub3.id,
      versionId: sub3v1.id,
      ruleId: ruleByCode.get('HR-RULE-04').id,
      ruleCode: 'HR-RULE-04',
      findingCode: 'FND-HR-202',
      category: 'preferred_word',
      highlightedText: 'unlimited',
      explanation:
        'Leave is governed by a fixed 24-day annual entitlement; "unlimited" misleads employees.',
      severity: 'Major',
      confidence: 100,
      evidence: 'Rule HR-RULE-04: Never describe paid time off as "unlimited".',
      suggestion: 'flexible (per annual leave policy)',
      unchangedNote: 'Encouraging employees to use their leave remains intact.',
      status: 'Open',
    },
    {
      submissionId: sub3.id,
      versionId: sub3v1.id,
      ruleId: ruleByCode.get('HR-RULE-06').id,
      ruleCode: 'HR-RULE-06',
      findingCode: 'FND-HR-203',
      category: 'required_messaging',
      highlightedText: '[Missing People Portal / HR Partner reference]',
      explanation:
        'HR policy announcements must direct employees to the People Portal or HR Partner for accommodations.',
      severity: 'Major',
      confidence: 95,
      evidence:
        'Rule HR-RULE-06: Include People Portal or HR Partner reference.',
      suggestion:
        'Please check the People Portal or reach out to your HR Partner for accommodation requests.',
      unchangedNote: 'Main policy summary remains unchanged.',
      status: 'Open',
    },
  ]);

  await db.insert(claims).values([
    {
      submissionId: sub3.id,
      versionId: sub3v1.id,
      claimText: 'only need to come to the office 1 day per week',
      category: 'employment_benefit',
      verdict: 'CONFLICTS',
      sourceId: factByCode.get('HR-FACT-02').id,
      sourceQuote:
        'Hybrid employees work on-site 3 days per week (Tuesday through Thursday) unless an accommodation is approved via the People Portal.',
      confidence: 96,
      explanation:
        'Contradicts HR-FACT-02 requiring 3 on-site days per week (Tuesday–Thursday).',
      suggestion:
        'Hybrid employees work on-site 3 days per week (Tuesday through Thursday)',
      reviewerStatus: 'Pending Review',
    },
  ]);

  await db.insert(approvals).values([
    {
      submissionId: sub3.id,
      versionId: sub3v1.id,
      reviewerId: hrManager.id,
      decision: 'Changes Requested',
      reason:
        'Please correct the hybrid attendance days to match HR-FACT-02 and remove non-inclusive wording.',
    },
  ]);

  const [sub4] = await db
    .insert(submissions)
    .values({
      title: 'Enterprise Retail Proposal — West Region',
      creatorId: salesCreator.id,
      departmentId: sales.id,
      contentType: 'Email',
      channel: 'Email',
      status: 'Under Review',
      currentVersion: 1,
      aiModeUsed: 'deterministic_fallback',
    })
    .returning();

  const [sub4v1] = await db
    .insert(versions)
    .values({
      submissionId: sub4.id,
      versionNumber: 1,
      content:
        'Our enterprise tier delivers 100% uptime and a risk-free rollout in just 5 business days with a 25% volume discount on 100 seats. Reach out to review our Enterprise SLA terms.',
      createdBy: salesCreator.id,
      changeSummary: 'Initial submission.',
    })
    .returning();

  await db.insert(findings).values([
    {
      submissionId: sub4.id,
      versionId: sub4v1.id,
      ruleId: ruleByCode.get('SLS-RULE-01').id,
      ruleCode: 'SLS-RULE-01',
      findingCode: 'FND-SLS-301',
      category: 'banned_word',
      highlightedText: '100% uptime',
      explanation:
        'Sales rule SLS-RULE-01 strictly forbids quoting 100% uptime in proposals.',
      severity: 'Blocker',
      confidence: 100,
      evidence: 'Rule SLS-RULE-01: Cite the approved 99.9% contractual SLA instead.',
      suggestion: '99.9% contractual SLA uptime',
      unchangedNote: 'Reliability positioning remains strong and legally accurate.',
      status: 'Open',
    },
    {
      submissionId: sub4.id,
      versionId: sub4v1.id,
      ruleId: ruleByCode.get('SLS-RULE-02').id,
      ruleCode: 'SLS-RULE-02',
      findingCode: 'FND-SLS-302',
      category: 'banned_word',
      highlightedText: 'risk-free',
      explanation:
        'Sales rule SLS-RULE-02 disallows absolute "risk-free" assurances.',
      severity: 'Major',
      confidence: 100,
      evidence:
        'Rule SLS-RULE-02: Replace with "supported by our standard onboarding SLA".',
      suggestion: 'supported by our standard onboarding SLA',
      unchangedNote: 'Customer reassurance remains clear.',
      status: 'Open',
    },
  ]);

  await db.insert(claims).values([
    {
      submissionId: sub4.id,
      versionId: sub4v1.id,
      claimText: 'rollout in just 5 business days',
      category: 'delivery',
      verdict: 'CONFLICTS',
      sourceId: factByCode.get('SLS-FACT-03').id,
      sourceQuote:
        'Standard enterprise onboarding takes 14 business days from contract signature.',
      confidence: 95,
      explanation:
        'Contradicts Implementation Lead fact SLS-FACT-03 (14 business days).',
      suggestion:
        'Standard enterprise onboarding takes 14 business days from contract signature',
      reviewerStatus: 'Pending Review',
    },
    {
      submissionId: sub4.id,
      versionId: sub4v1.id,
      claimText: '25% volume discount on 100 seats',
      category: 'pricing',
      verdict: 'UNVERIFIED',
      sourceId: factByCode.get('SLS-FACT-02').id,
      sourceQuote:
        'Annual enterprise volume discounts start at 15% for commitments above 250 seats.',
      confidence: 65,
      explanation:
        'SLS-FACT-02 only authorizes 15% discounts above 250 seats; 25% on 100 seats requires custom Revenue Operations sign-off.',
      suggestion:
        'Annual enterprise volume discounts start at 15% for commitments above 250 seats',
      reviewerStatus: 'Pending Review',
    },
  ]);

  await db.insert(auditLogs).values([
    {
      userId: mktCreator.id,
      submissionId: sub1.id,
      action: 'SUBMISSION_RESUBMITTED',
      details:
        'Marketing Creator submitted Version 3 for approval after resolving findings.',
    },
    {
      userId: mktManager.id,
      submissionId: sub2.id,
      action: 'SUBMISSION_APPROVED',
      details:
        'Marketing Manager approved Seasonal Soil-Health Guide Blog Post (v1).',
    },
    {
      userId: hrManager.id,
      submissionId: sub3.id,
      action: 'CHANGES_REQUESTED',
      details:
        'HR Manager requested changes on Q4 Hybrid Schedule & Leave Update (v1).',
    },
  ]);

  const check = await db
    .select()
    .from(users)
    .where(eq(users.email, 'admin@brandos.demo'))
    .limit(1);
  return {
    seeded: check.length > 0,
    message:
      'Seeded 3 departments, 7 demo users, 21 guidelines, 10 approved facts, and 4 sample submissions.',
  };
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('seed.js');
if (isDirectRun) {
  seedDatabaseIfEmpty()
    .then((res) => {
      console.log(res.message);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
