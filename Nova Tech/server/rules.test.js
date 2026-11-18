import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isEmployeeOrAdmin,
  isAdmin,
  canManagePublications,
  canApproveContent,
  canVerifyClaims,
  canDeleteArticles,
  isPubliclyPublishable,
  sanitizePublicArticle,
  validateContactEnquiry,
  validateRegistration,
  validateArticlePayload,
  calculateReadingTime,
  normalizeTags,
  buildBrandosHandoffUrl,
  slugifyTitle,
} from './rules.js';

test('employee and admin visibility rules block guests and customers', () => {
  assert.equal(isEmployeeOrAdmin(null), false);
  assert.equal(isEmployeeOrAdmin({ websiteRole: 'guest' }), false);
  assert.equal(isEmployeeOrAdmin({ websiteRole: 'customer' }), false);
  assert.equal(isEmployeeOrAdmin({ websiteRole: 'employee', isActive: false }), false);
  assert.equal(isEmployeeOrAdmin({ websiteRole: 'employee', isActive: true }), true);
  assert.equal(isEmployeeOrAdmin({ websiteRole: 'admin', isActive: true }), true);
  assert.equal(isAdmin({ websiteRole: 'employee' }), false);
  assert.equal(isAdmin({ websiteRole: 'admin' }), true);
});

test('BrandOS role permissions restrict publishing, approving, verifying, and deleting', () => {
  const creator = { websiteRole: 'employee', brandosRole: 'Creator', isActive: true };
  const reviewer = { websiteRole: 'employee', brandosRole: 'Reviewer', isActive: true };
  const manager = { websiteRole: 'employee', brandosRole: 'Manager', isActive: true };
  const publisher = { websiteRole: 'employee', brandosRole: 'Publisher', isActive: true };
  const admin = { websiteRole: 'admin', brandosRole: 'Admin', isActive: true };

  assert.equal(canVerifyClaims(creator), false);
  assert.equal(canVerifyClaims(reviewer), true);
  assert.equal(canApproveContent(reviewer), false);
  assert.equal(canApproveContent(manager), true);
  assert.equal(canManagePublications(manager), false);
  assert.equal(canManagePublications(publisher), true);
  assert.equal(canDeleteArticles(creator), false);
  assert.equal(canDeleteArticles(admin), true);
});

test('public publication gate strictly rejects drafts, under_review, rejected, and unverified posts', () => {
  const validPost = {
    id: 'post-1',
    slug: 'valid-post',
    title: 'Valid Published Post',
    summary: 'Summary text for the article.',
    excerpt: 'Summary text for the article.',
    content: 'Full content body with sufficient words to pass validation checks.',
    category: 'AI & Automation',
    tags: ['AI', 'Governance'],
    department: 'Marketing',
    authorName: 'Marcus Chen',
    status: 'published',
    approvalStatus: 'approved',
    requiredClaimsVerified: true,
    brandosSubmissionId: 'BOS-2026-101',
    approvedBy: 'David Morales',
    publishedBy: 'Sophia Alverez',
    publishedAt: '2026-11-10T10:00:00.000Z',
    reviewNotes: 'INTERNAL SECRET REVIEW NOTE',
    findings: [{ severity: 'low', note: 'Internal finding' }],
  };

  assert.equal(isPubliclyPublishable(validPost), true);
  assert.equal(isPubliclyPublishable({ ...validPost, status: 'draft' }), false);
  assert.equal(isPubliclyPublishable({ ...validPost, status: 'under_review' }), false);
  assert.equal(isPubliclyPublishable({ ...validPost, status: 'unpublished' }), false);
  assert.equal(isPubliclyPublishable({ ...validPost, status: 'changes_requested' }), false);
  assert.equal(isPubliclyPublishable({ ...validPost, approvalStatus: 'rejected' }), false);
  assert.equal(isPubliclyPublishable({ ...validPost, approvalStatus: 'pending' }), false);
  assert.equal(isPubliclyPublishable({ ...validPost, requiredClaimsVerified: false }), false);
  assert.equal(isPubliclyPublishable({ ...validPost, brandosSubmissionId: '' }), false);
  assert.equal(isPubliclyPublishable({ ...validPost, isDeleted: true }), false);

  const sanitized = sanitizePublicArticle(validPost);
  assert.ok(sanitized);
  assert.equal('reviewNotes' in sanitized, false);
  assert.equal('findings' in sanitized, false);
  assert.equal('approvedBy' in sanitized, false);
  assert.deepEqual(sanitized.tags, ['AI', 'Governance']);
  assert.equal(sanitizePublicArticle({ ...validPost, status: 'draft' }), null);
});

test('article validator checks unique slugs, fields, reading time, and tags', () => {
  const existing = [{ id: 'ins_1', slug: 'existing-slug' }];
  const duplicate = validateArticlePayload(
    {
      title: 'Existing Slug Article',
      slug: 'existing-slug',
      excerpt: 'Valid excerpt with enough characters to pass.',
      content: 'This is a long enough body of text for an insight article to validate cleanly in our unit tests.',
      category: 'AI & Automation',
      tags: 'AI, Governance, ai',
    },
    existing,
    'ins_2'
  );
  assert.equal(duplicate.valid, false);
  assert.ok(duplicate.errors.slug);

  const valid = validateArticlePayload(
    {
      title: 'Fresh Validated Article',
      slug: 'fresh-validated-article',
      excerpt: 'Valid excerpt with enough characters to pass.',
      content: 'This is a long enough body of text for an insight article to validate cleanly in our unit tests.',
      category: 'Software Architecture',
      tags: 'Architecture, APIs,  architecture ',
    },
    existing,
    'ins_2'
  );
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.cleaned.tags, ['Architecture', 'APIs']);
  assert.equal(valid.cleaned.readingTime, '1 min read');
});

test('normalizeTags and calculateReadingTime behave deterministically', () => {
  assert.deepEqual(normalizeTags('#AI, Cloud, ai,  DevOps '), ['AI', 'Cloud', 'DevOps']);
  assert.equal(calculateReadingTime('word '.repeat(450)), '3 min read');
});

test('registration validator enforces customer role regardless of payload', () => {
  const result = validateRegistration({
    name: 'Alex Morgan',
    email: 'Alex@Example.com',
    password: 'StrongPassword123',
    company: 'Acme Corp',
    websiteRole: 'admin',
  });
  assert.equal(result.valid, true);
  assert.equal(result.cleaned.websiteRole, 'customer');
  assert.equal(result.cleaned.email, 'alex@example.com');
});

test('contact enquiry validator rejects invalid emails and short messages', () => {
  const invalid = validateContactEnquiry({
    name: 'Sam',
    email: 'not-an-email',
    subject: 'Hi',
    message: 'Too short',
  });
  assert.equal(invalid.valid, false);
});

test('BrandOS handoff URL builder uses opaque ticket only and validates URLs', () => {
  const url = buildBrandosHandoffUrl('http://localhost:5174', 'sso_abc123', '/submissions/new');
  assert.equal(url, 'http://localhost:5174/submissions/new?sso_ticket=sso_abc123');
  assert.equal(buildBrandosHandoffUrl('', 'sso_abc123'), null);
});

test('slugifyTitle produces clean URL slugs', () => {
  assert.equal(
    slugifyTitle('How AI Is Transforming Modern Business Workflows!'),
    'how-ai-is-transforming-modern-business-workflows'
  );
});
