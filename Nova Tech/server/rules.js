export const WEBSITE_ROLES = Object.freeze({
  GUEST: 'guest',
  CUSTOMER: 'customer',
  EMPLOYEE: 'employee',
  ADMIN: 'admin',
});

export const BRANDOS_ROLES = Object.freeze([
  'Creator',
  'Reviewer',
  'Manager',
  'Publisher',
  'Admin',
]);

export const DEPARTMENTS = Object.freeze([
  'Marketing',
  'HR',
  'Sales',
  'Engineering',
  'Executive',
]);

export const INSIGHT_CATEGORIES = Object.freeze([
  'AI & Automation',
  'Software Architecture',
  'Product Design',
  'Cloud Systems',
  'Digital Strategy',
  'Brand Governance',
]);

export function isEmployeeOrAdmin(user) {
  if (!user || user.isActive === false) return false;
  return (
    user.websiteRole === WEBSITE_ROLES.EMPLOYEE ||
    user.websiteRole === WEBSITE_ROLES.ADMIN
  );
}

export function isAdmin(user) {
  if (!user || user.isActive === false) return false;
  return user.websiteRole === WEBSITE_ROLES.ADMIN;
}

export function canReviewApprovals(user) {
  if (!isEmployeeOrAdmin(user)) return false;
  return ['Reviewer', 'Manager', 'Publisher', 'Admin'].includes(user.brandosRole);
}

export function canManagePublications(user) {
  if (!isEmployeeOrAdmin(user)) return false;
  return (
    user.websiteRole === WEBSITE_ROLES.ADMIN ||
    ['Publisher', 'Admin'].includes(user.brandosRole)
  );
}

export function canApproveContent(user) {
  if (!isEmployeeOrAdmin(user)) return false;
  return (
    user.websiteRole === WEBSITE_ROLES.ADMIN ||
    ['Manager', 'Publisher', 'Admin'].includes(user.brandosRole)
  );
}

export function canVerifyClaims(user) {
  if (!isEmployeeOrAdmin(user)) return false;
  return (
    user.websiteRole === WEBSITE_ROLES.ADMIN ||
    ['Reviewer', 'Manager', 'Publisher', 'Admin'].includes(user.brandosRole)
  );
}

export function canDeleteArticles(user) {
  if (!isEmployeeOrAdmin(user)) return false;
  return (
    user.websiteRole === WEBSITE_ROLES.ADMIN ||
    ['Publisher', 'Admin'].includes(user.brandosRole)
  );
}

export function isPubliclyPublishable(post) {
  if (!post || typeof post !== 'object') return false;
  if (post.isDeleted === true) return false;
  if (post.status !== 'published') return false;
  if (post.approvalStatus !== 'approved') return false;
  if (post.requiredClaimsVerified !== true) return false;
  if (!post.brandosSubmissionId || String(post.brandosSubmissionId).trim() === '') return false;
  if (!post.approvedBy || String(post.approvedBy).trim() === '') return false;
  if (!post.publishedBy || String(post.publishedBy).trim() === '') return false;
  if (!post.publishedAt || String(post.publishedAt).trim() === '') return false;
  return true;
}

export function calculateReadingTime(content) {
  const words = String(content || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

export function normalizeTags(tagsInput) {
  const rawList = Array.isArray(tagsInput)
    ? tagsInput
    : typeof tagsInput === 'string'
      ? tagsInput.split(',')
      : [];
  const seen = new Set();
  const normalized = [];
  for (const item of rawList) {
    const clean = String(item || '').trim().replace(/^#+/, '');
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(clean);
    }
  }
  return normalized.slice(0, 10);
}

export function sanitizePublicArticle(post) {
  if (!isPubliclyPublishable(post)) return null;
  const excerpt = post.excerpt || post.summary || '';
  const readingTime = post.readingTime || post.readTime || calculateReadingTime(post.content);
  const featured = Boolean(post.featured ?? post.isFeatured);
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    summary: excerpt,
    excerpt,
    content: post.content,
    category: post.category,
    tags: Array.isArray(post.tags) ? post.tags : [],
    department: post.department,
    authorName: post.authorName,
    authorRole: post.authorRole || post.department,
    coverImage: post.coverImage,
    readTime: readingTime,
    readingTime,
    seoTitle: post.seoTitle || post.title,
    seoDescription: post.seoDescription || excerpt,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt || post.publishedAt,
    isFeatured: featured,
    featured,
    isSeedDemo: Boolean(post.isSeedDemo),
    brandosSubmissionId: post.brandosSubmissionId,
  };
}

export function sanitizeManagedArticle(post) {
  if (!post || typeof post !== 'object') return null;
  const excerpt = post.excerpt || post.summary || '';
  const readingTime = post.readingTime || post.readTime || calculateReadingTime(post.content);
  const featured = Boolean(post.featured ?? post.isFeatured);
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    summary: excerpt,
    excerpt,
    content: post.content,
    category: post.category,
    tags: Array.isArray(post.tags) ? post.tags : [],
    department: post.department,
    authorName: post.authorName,
    authorRole: post.authorRole || post.department,
    coverImage: post.coverImage,
    readTime: readingTime,
    readingTime,
    seoTitle: post.seoTitle || post.title,
    seoDescription: post.seoDescription || excerpt,
    status: post.status,
    publicationStatus: post.publicationStatus || post.status,
    approvalStatus: post.approvalStatus,
    requiredClaimsVerified: Boolean(post.requiredClaimsVerified),
    brandosSubmissionId: post.brandosSubmissionId || '',
    approvedBy: post.approvedBy || null,
    publishedBy: post.publishedBy || null,
    publishedAt: post.publishedAt || null,
    updatedAt: post.updatedAt || post.publishedAt || post.createdAt || null,
    createdAt: post.createdAt || post.publishedAt || null,
    featured,
    isFeatured: featured,
    isSeedDemo: Boolean(post.isSeedDemo),
    isPublic: isPubliclyPublishable(post),
    reviewNotes: post.reviewNotes || '',
  };
}

export function sanitizePublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    websiteRole: user.websiteRole,
    company: user.company || null,
    department: isEmployeeOrAdmin(user) ? user.department || null : null,
    brandosRole: isEmployeeOrAdmin(user) ? user.brandosRole || null : null,
    jobTitle: isEmployeeOrAdmin(user) ? user.jobTitle || null : null,
    notificationPreferences: user.notificationPreferences || {
      productUpdates: true,
      enquiryReplies: true,
    },
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

export function validateContactEnquiry(payload) {
  const errors = {};
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload?.email === 'string' ? payload.email.trim() : '';
  const company = typeof payload?.company === 'string' ? payload.company.trim() : '';
  const subject = typeof payload?.subject === 'string' ? payload.subject.trim() : '';
  const message = typeof payload?.message === 'string' ? payload.message.trim() : '';

  if (name.length < 2) errors.name = 'Please enter your full name (at least 2 characters).';
  if (!validateEmail(email)) errors.email = 'Please provide a valid business email address.';
  if (subject.length < 3) errors.subject = 'Please provide a clear subject line.';
  if (message.length < 15) errors.message = 'Please include at least 15 characters describing your enquiry.';
  if (message.length > 4000) errors.message = 'Message must be under 4,000 characters.';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    cleaned: { name, email: email.toLowerCase(), company, subject, message },
  };
}

export function validateRegistration(payload) {
  const errors = {};
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload?.password === 'string' ? payload.password : '';
  const company = typeof payload?.company === 'string' ? payload.company.trim() : '';

  if (name.length < 2) errors.name = 'Full name must be at least 2 characters.';
  if (!validateEmail(email)) errors.email = 'Please enter a valid email address.';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters long.';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    cleaned: {
      name,
      email,
      password,
      company,
      websiteRole: WEBSITE_ROLES.CUSTOMER,
    },
  };
}

export function slugifyTitle(title) {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function validateArticlePayload(payload, existingArticles = [], excludeId = null) {
  const errors = {};
  const title = typeof payload?.title === 'string' ? payload.title.trim() : '';
  const rawSlug = typeof payload?.slug === 'string' ? payload.slug.trim() : '';
  const slug = slugifyTitle(rawSlug || title);
  const excerpt =
    typeof payload?.excerpt === 'string'
      ? payload.excerpt.trim()
      : typeof payload?.summary === 'string'
        ? payload.summary.trim()
        : '';
  const content = typeof payload?.content === 'string' ? payload.content.trim() : '';
  const category = typeof payload?.category === 'string' ? payload.category.trim() : '';
  const coverImage = typeof payload?.coverImage === 'string' ? payload.coverImage.trim() : '';
  const seoTitle = typeof payload?.seoTitle === 'string' ? payload.seoTitle.trim() : '';
  const seoDescription =
    typeof payload?.seoDescription === 'string' ? payload.seoDescription.trim() : '';
  const tags = normalizeTags(payload?.tags);

  if (title.length < 5) {
    errors.title = 'Article title must be at least 5 characters.';
  }
  if (!slug || slug.length < 3) {
    errors.slug = 'A valid URL slug (at least 3 alphanumeric characters) is required.';
  } else if (
    existingArticles.some(
      (item) => item.id !== excludeId && item.slug.toLowerCase() === slug.toLowerCase()
    )
  ) {
    errors.slug = `The slug "${slug}" is already assigned to another article.`;
  }
  if (excerpt.length < 20) {
    errors.excerpt = 'Excerpt must be at least 20 characters.';
  }
  if (content.length < 60) {
    errors.content = 'Article body must be at least 60 characters.';
  }
  if (!category) {
    errors.category = 'Please select an article category.';
  }
  if (coverImage && !coverImage.startsWith('/') && !coverImage.startsWith('http://') && !coverImage.startsWith('https://') && !coverImage.startsWith('data:image/')) {
    errors.coverImage = 'Cover image must be a valid asset path, HTTPS URL, or uploaded image.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    cleaned: {
      title,
      slug,
      excerpt,
      summary: excerpt,
      content,
      category,
      tags,
      coverImage: coverImage || '/src/assets/images/insight_ai_workflows_1794980382417.jpg',
      seoTitle: seoTitle || title,
      seoDescription: seoDescription || excerpt,
      readingTime: calculateReadingTime(content),
      readTime: calculateReadingTime(content),
    },
  };
}

export function buildBrandosHandoffUrl(baseUrl, ssoTicket, targetPath = '/submissions/new') {
  if (!baseUrl || typeof baseUrl !== 'string' || !baseUrl.trim()) {
    return null;
  }
  if (!ssoTicket || typeof ssoTicket !== 'string' || !ssoTicket.trim()) {
    return null;
  }
  try {
    const parsed = new URL(baseUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    const normalizedPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
    const target = new URL(normalizedPath, parsed.origin);
    target.searchParams.set('sso_ticket', ssoTicket.trim());
    return target.toString();
  } catch {
    return null;
  }
}
