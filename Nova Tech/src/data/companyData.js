export const ASSETS = {
  heroPlatform: '/src/assets/images/hero_novatech_platform_1794980381208.jpg',
  solutionsWorkspace: '/src/assets/images/solutions_enterprise_workspace_1794980381381.jpg',
  aiWorkflows: '/src/assets/images/insight_ai_workflows_1794980382417.jpg',
  cloudArchitecture: '/src/assets/images/insight_cloud_architecture_1794980382191.jpg',
  productDesign: '/src/assets/images/insight_product_design_1794980381990.jpg',
};

export const SERVICES = [
  {
    slug: 'custom-software-development',
    number: '01.',
    name: 'Custom Software Development',
    shortDescription:
      'Scalable web and software applications designed around specific operational requirements and long-term maintainability.',
    fullDescription:
      'We architect and engineer bespoke business applications from foundational data models to production deployment. Every system is structured with clean service boundaries, automated test coverage, and clear API contracts so your internal engineering teams can evolve it confidently.',
    capabilities: [
      'Modular backend APIs and domain-driven service architecture',
      'Legacy system modernization and structured data migration',
      'Role-based access portals and multi-department workflow tools',
      'Automated regression suites and continuous delivery pipelines',
    ],
    businessValue:
      'Eliminates fragile spreadsheet workarounds and manual data re-entry while establishing software assets your organization owns and controls.',
    deliverables: ['System Architecture Blueprint', 'Production Web & API Codebase', 'Automated Test Suite', 'Technical Documentation'],
    image: ASSETS.heroPlatform,
    icon: 'Code2',
  },
  {
    slug: 'ai-and-intelligent-automation',
    number: '02.',
    name: 'AI and Intelligent Automation',
    shortDescription:
      'AI-powered workflows, intelligent document review tools, and deterministic automation pipelines built for reliability.',
    fullDescription:
      'Rather than deploying disconnected chat widgets, we embed language models and structured rule engines directly into operational workflows—such as compliance verification, content governance, knowledge retrieval, and intake classification—with human-in-the-loop sign-off.',
    capabilities: [
      'Structured document classification and automated claim extraction',
      'Policy-aware review queues with human approval checkpoints',
      'Enterprise knowledge search grounded in verified internal records',
      'Audit-ready logging for every automated recommendation',
    ],
    businessValue:
      'Reduces repetitive review bottlenecks across Marketing, HR, and Operations while maintaining strict factual accuracy and human oversight.',
    deliverables: ['Workflow Automation Pipeline', 'Evaluation & Guardrail Harness', 'Human Review Interface', 'Audit Trail Integration'],
    image: ASSETS.aiWorkflows,
    icon: 'Cpu',
  },
  {
    slug: 'web-application-development',
    number: '03.',
    name: 'Web Application Development',
    shortDescription:
      'Modern, responsive, high-performance web applications engineered for clarity across desktop, tablet, and mobile.',
    fullDescription:
      'We build fast, accessible React web applications and customer portals that handle complex operational data without overwhelming users. From real-time dashboards to public corporate platforms, we prioritize responsive ergonomics and predictable state management.',
    capabilities: [
      'Accessible component libraries adhering to WCAG AA contrast',
      'Responsive multi-viewport layouts for desktop and mobile teams',
      'Secure session-based authentication and role-aware routing',
      'Performance optimization for fast initial load and fluid navigation',
    ],
    businessValue:
      'Delivers cohesive digital experiences for both external customers and internal employees, increasing adoption and reducing support overhead.',
    deliverables: ['Responsive Frontend Application', 'Reusable Component System', 'API Integration Layer', 'Cross-Browser Verification'],
    image: ASSETS.solutionsWorkspace,
    icon: 'Globe',
  },
  {
    slug: 'ui-ux-and-product-design',
    number: '04.',
    name: 'UI/UX and Product Design',
    shortDescription:
      'User-focused digital experiences and structured product interfaces shaped around real operational tasks.',
    fullDescription:
      'Our product designers partner directly with engineering and domain leads to map user journeys, simplify multi-step forms, and establish clear visual hierarchy before implementation begins.',
    capabilities: [
      'Workflow discovery and information architecture mapping',
      'Interactive wireframes and high-fidelity interface prototypes',
      'Design systems with typographic scales and accessible color tokens',
      'Usability testing across complex enterprise dashboards',
    ],
    businessValue:
      'Shortens onboarding time for new users, reduces form abandonment and input errors, and ensures consistent visual quality across products.',
    deliverables: ['User Journey Maps', 'Design Token Specification', 'Interactive UI Prototypes', 'Accessibility Audit Checklist'],
    image: ASSETS.productDesign,
    icon: 'Layers',
  },
  {
    slug: 'cloud-and-digital-solutions',
    number: '05.',
    name: 'Cloud and Digital Solutions',
    shortDescription:
      'Modern cloud infrastructure, resilient API gateways, and scalable digital systems engineered for predictable uptime.',
    fullDescription:
      'We help organizations structure reliable cloud environments with clear network boundaries, automated health monitoring, least-privilege secrets management, and seamless single-sign-on integration between internal tools.',
    capabilities: [
      'Containerized service deployment and environment isolation',
      'Single Sign-On (SSO) and backend-mediated session handoffs',
      'Structured telemetry, health checks, and failure recovery patterns',
      'Database backup automation and schema migration workflows',
    ],
    businessValue:
      'Protects service availability during demand spikes and keeps authentication boundaries clean across interconnected enterprise applications.',
    deliverables: ['Cloud Topology Design', 'Container & Deployment Config', 'SSO Integration Protocol', 'Operational Runbooks'],
    image: ASSETS.cloudArchitecture,
    icon: 'Cloud',
  },
  {
    slug: 'technology-consulting',
    number: '06.',
    name: 'Technology Consulting',
    shortDescription:
      'Technical strategy, architecture reviews, and pragmatic digital transformation roadmaps aligned with business priorities.',
    fullDescription:
      'We work alongside executive and engineering leadership to evaluate technical debt, design pragmatic modernization phases, and select fit-for-purpose software architectures that match team capacity and budget.',
    capabilities: [
      'Codebase and infrastructure architecture assessments',
      'Build-vs-integrate evaluations and vendor integration planning',
      'Phased modernization roadmaps minimizing operational disruption',
      'Governance and security posture reviews for internal platforms',
    ],
    businessValue:
      'Prevents costly architectural missteps and aligns technology investments directly to measurable operational priorities.',
    deliverables: ['Technical Assessment Report', 'Prioritized Modernization Roadmap', 'Integration Risk Matrix', 'Executive Briefing'],
    image: ASSETS.heroPlatform,
    icon: 'Compass',
  },
];

export const SOLUTION_CONCEPTS = [
  {
    id: 'ai-business-tools',
    category: 'Business Automation',
    title: 'AI-Powered Business Tools',
    conceptLabel: 'Demonstration Concept',
    problem:
      'Teams spend hours manually summarizing lengthy briefs, checking policy alignment, and extracting verifiable facts across disconnected documents.',
    approach:
      'Structured AI intake pipelines parse incoming drafts, highlight unsupported claims, and route exceptions to designated subject-matter reviewers.',
    outcome:
      'Faster review preparation with explicit provenance for every automated suggestion.',
    image: ASSETS.aiWorkflows,
  },
  {
    id: 'workflow-automation',
    category: 'Workflow Automation',
    title: 'Multi-Stage Approval & Compliance Workflows',
    conceptLabel: 'Demonstration Concept',
    problem:
      'Ad-hoc email and chat approvals leave gaps in accountability, making it difficult to prove who signed off on external communications or operational changes.',
    approach:
      'Role-enforced state machines connect creators, reviewers, and managers with immutable timestamps and automated publication gates.',
    outcome:
      'Clear departmental ownership and zero unapproved materials reaching external channels.',
    image: ASSETS.solutionsWorkspace,
  },
  {
    id: 'internal-platforms',
    category: 'Intelligent Content Management',
    title: 'Internal Management Platforms (BrandOS Integration Model)',
    conceptLabel: 'Demonstration Concept',
    problem:
      'Public company websites and internal governance systems often operate as isolated silos, forcing staff to re-authenticate or copy-paste approved copy manually.',
    approach:
      'Backend-mediated SSO tickets pass verified employee department and role context from the corporate portal into internal platforms like BrandOS, while publication webhooks synchronize approved records back to public pages.',
    outcome:
      'Seamless employee workflow continuity paired with strict separation between internal drafts and public content.',
    image: ASSETS.cloudArchitecture,
  },
  {
    id: 'customer-applications',
    category: 'Digital Platforms',
    title: 'Customer-Facing Web Applications',
    conceptLabel: 'Demonstration Concept',
    problem:
      'B2B customers lack a unified portal to manage account preferences, track active enquiries, and access verified technical updates.',
    approach:
      'Authenticated customer portals enforce strict tenant isolation, keeping external client experiences clean while blocking internal employee tooling.',
    outcome:
      'Transparent self-service communication and higher confidence across client engagements.',
    image: ASSETS.productDesign,
  },
  {
    id: 'digital-transformation',
    category: 'Data-Driven Applications',
    title: 'Digital Transformation & Data Consolidation',
    conceptLabel: 'Demonstration Concept',
    problem:
      'Legacy operational teams rely on fragmented spreadsheets that slow down reporting and introduce reconciliation errors.',
    approach:
      'Incremental API integration layers connect existing records into unified, tabular-aligned operational views with clear audit trails.',
    outcome:
      'Modernized decision-making without forcing disruptive overnight system cutovers.',
    image: ASSETS.heroPlatform,
  },
];

export const WHY_CHOOSE_ITEMS = [
  {
    title: 'Modern Technology',
    description:
      'We build on proven web standards, clean JavaScript and Node ecosystems, and modular APIs rather than brittle proprietary lock-in.',
  },
  {
    title: 'Scalable Architecture',
    description:
      'Clear separation between public edges, business rules, and data layers keeps platforms adaptable as teams and traffic expand.',
  },
  {
    title: 'Practical Innovation',
    description:
      'We apply AI and automation where they measurably reduce review friction or improve accuracy—never as novelty decoration.',
  },
  {
    title: 'Reliable Development',
    description:
      'Unit-tested domain logic, server-side input validation, and disciplined error handling ensure predictable behavior in production.',
  },
  {
    title: 'User-Focused Design',
    description:
      'Every interface is designed for clarity, WCAG-compliant contrast, and responsive operation across desktop and mobile viewports.',
  },
  {
    title: 'Continuous Improvement',
    description:
      'Structured feedback loops, clean documentation, and maintainable codebases enable steady iteration long after initial launch.',
  },
];

export const TEAM_PROFILES = [
  {
    name: 'Sophia Alverez',
    role: 'VP of Digital Governance & Platform Strategy',
    department: 'Executive',
    bio: 'Leads NovaTech’s cross-platform architecture and internal governance initiatives, ensuring public digital channels and BrandOS workflows stay cleanly aligned.',
  },
  {
    name: 'Marcus Chen',
    role: 'Product Marketing Lead',
    department: 'Marketing',
    bio: 'Directs technical storytelling and product communications, coordinating verified Insights publications through BrandOS review workflows.',
  },
  {
    name: 'Priya Nair',
    role: 'People & Compliance Lead',
    department: 'HR',
    bio: 'Oversees organizational readiness, policy review standards, and Claim Ledger verification practices across multi-department teams.',
  },
  {
    name: 'David Morales',
    role: 'Enterprise Solutions Director',
    department: 'Sales',
    bio: 'Partners with prospective organizations to scope custom software, workflow automation, and digital transformation engagements.',
  },
];
