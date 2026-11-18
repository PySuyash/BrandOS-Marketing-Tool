import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import {
  WEBSITE_ROLES,
  DEPARTMENTS,
  BRANDOS_ROLES,
  INSIGHT_CATEGORIES,
  isEmployeeOrAdmin,
  isAdmin,
  canReviewApprovals,
  canManagePublications,
  canApproveContent,
  canVerifyClaims,
  canDeleteArticles,
  calculateReadingTime,
  isPubliclyPublishable,
  sanitizePublicArticle,
  sanitizeManagedArticle,
  sanitizePublicUser,
  validateContactEnquiry,
  validateRegistration,
  validateArticlePayload,
  buildBrandosHandoffUrl,
  slugifyTitle,
} from './server/rules.js';
import {
  SESSION_COOKIE_NAME,
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  parseCookies,
  getCookieOptions,
  issueSsoTicket,
  consumeSsoTicket,
  verifyBrandosSharedSecret,
} from './server/auth.js';
import { initDatabase, readDb, updateDb, getDemoPassword } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

const COVER_IMAGE_LIBRARY = [
  {
    label: 'AI Workflows Studio',
    url: '/src/assets/images/insight_ai_workflows_1794980382417.jpg',
  },
  {
    label: 'Cloud & Architecture',
    url: '/src/assets/images/insight_cloud_architecture_1794980382191.jpg',
  },
  {
    label: 'Product Design Lab',
    url: '/src/assets/images/insight_product_design_1794980381990.jpg',
  },
  {
    label: 'Enterprise Workspace',
    url: '/src/assets/images/solutions_enterprise_workspace_1794980381381.jpg',
  },
  {
    label: 'NovaTech Platform',
    url: '/src/assets/images/hero_novatech_platform_1794980381208.jpg',
  },
];

function getArticlePermissions(user) {
  return {
    canCreate: isEmployeeOrAdmin(user),
    canEdit: isEmployeeOrAdmin(user),
    canVerifyClaims: canVerifyClaims(user),
    canApprove: canApproveContent(user),
    canPublish: canManagePublications(user),
    canFeature: canManagePublications(user),
    canDelete: canDeleteArticles(user),
  };
}

function getConfiguredBrandosUrl() {
  const raw = process.env.BRANDOS_URL || process.env.VITE_BRANDOS_URL || '';
  return raw.trim().replace(/\/+$/, '');
}

function getConfiguredBrandosApiUrl() {
  const raw =
    process.env.BRANDOS_API_URL ||
    process.env.BRANDOS_URL ||
    process.env.VITE_BRANDOS_URL ||
    '';
  return raw.trim().replace(/\/+$/, '');
}

async function probeBrandosHealth(baseUrl) {
  if (!baseUrl) {
    return { configured: false, reachable: false, reason: 'BRANDOS_URL is not configured.' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok || res.status < 500) {
      return { configured: true, reachable: true, status: res.status };
    }
    return {
      configured: true,
      reachable: false,
      reason: `BrandOS responded with HTTP ${res.status}.`,
    };
  } catch (err) {
    clearTimeout(timer);
    try {
      const fallbackController = new AbortController();
      const fallbackTimer = setTimeout(() => fallbackController.abort(), 1200);
      const rootRes = await fetch(baseUrl, {
        method: 'HEAD',
        signal: fallbackController.signal,
      });
      clearTimeout(fallbackTimer);
      if (rootRes.ok || rootRes.status < 500) {
        return { configured: true, reachable: true, status: rootRes.status };
      }
    } catch {
      // Ignore fallback error and report original diagnostic
    }
    return {
      configured: true,
      reachable: false,
      reason:
        err?.name === 'AbortError'
          ? `Connection to ${baseUrl} timed out.`
          : `Could not connect to ${baseUrl}. Ensure the BrandOS server is running.`,
    };
  }
}

async function startServer() {
  initDatabase();

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '5mb' }));

  // Attach authenticated user from signed HttpOnly session cookie or Authorization Bearer token
  app.use((req, _res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    const cookieToken = cookies[SESSION_COOKIE_NAME];
    const authHeader = req.headers.authorization;
    const bearerToken =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null;
    const token = cookieToken || bearerToken;
    const verified = verifySessionToken(token);
    if (verified) {
      const db = readDb();
      const found = db.users.find((u) => u.id === verified.uid);
      if (found && found.isActive !== false) {
        req.user = found;
      }
    }
    next();
  });

  function requireAuth(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    next();
  }

  function requireEmployee(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!isEmployeeOrAdmin(req.user)) {
      return res.status(403).json({
        error: 'Access denied. Employee or Administrator credentials are required.',
      });
    }
    next();
  }

  function requireAdmin(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'Access denied. Administrator role required.' });
    }
    next();
  }

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'novatech-corporate-portal',
      timestamp: new Date().toISOString(),
    });
  });

  // --- Authentication Endpoints ---
  app.get('/api/auth/me', (req, res) => {
    if (!req.user) {
      return res.json({ authenticated: false, user: null });
    }
    res.json({
      authenticated: true,
      user: sanitizePublicUser(req.user),
    });
  });

  app.get('/api/auth/demo-accounts', (_req, res) => {
    const db = readDb();
    const demoUsers = db.users
      .filter((u) => u.isDemoAccount)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        websiteRole: u.websiteRole,
        department: u.department,
        brandosRole: u.brandosRole,
        jobTitle: u.jobTitle,
      }));
    res.json({
      demoEnabled: process.env.DISABLE_DEMO_LOGIN !== 'true',
      demoPasswordHint: getDemoPassword(),
      accounts: demoUsers,
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = readDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (user.isActive === false) {
      return res.status(403).json({
        error: 'This account has been deactivated. Contact a NovaTech administrator.',
      });
    }

    const token = createSessionToken(user);
    res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions(req));
    res.json({
      authenticated: true,
      sessionToken: token,
      user: sanitizePublicUser(user),
    });
  });

  app.post('/api/auth/demo-login', (req, res) => {
    if (process.env.DISABLE_DEMO_LOGIN === 'true') {
      return res.status(403).json({ error: 'Demo login is disabled.' });
    }

    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) {
      return res.status(400).json({ error: 'Demo account email is required.' });
    }

    const db = readDb();
    const user = db.users.find(
      (u) => u.isDemoAccount === true && u.email.toLowerCase() === email
    );
    if (!user) {
      return res.status(404).json({ error: 'Requested demonstration account was not found.' });
    }
    if (user.isActive === false) {
      return res.status(403).json({
        error: 'This demonstration account has been deactivated by an administrator.',
      });
    }

    const token = createSessionToken(user);
    res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions(req));
    res.json({
      authenticated: true,
      sessionToken: token,
      user: sanitizePublicUser(user),
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const validation = validateRegistration(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Please review the highlighted registration fields.',
        fieldErrors: validation.errors,
      });
    }

    const { name, email, password, company } = validation.cleaned;
    const db = readDb();
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      return res.status(409).json({
        error: 'An account with this email address already exists.',
      });
    }

    const newUser = {
      id: `usr_${crypto.randomBytes(6).toString('hex')}`,
      name,
      email,
      passwordHash: hashPassword(password),
      websiteRole: WEBSITE_ROLES.CUSTOMER,
      company: company || 'Independent Client',
      department: null,
      brandosRole: null,
      jobTitle: null,
      notificationPreferences: { productUpdates: true, enquiryReplies: true },
      isActive: true,
      isDemoAccount: false,
      createdAt: new Date().toISOString(),
    };

    updateDb((state) => {
      state.users.push(newUser);
    });

    const token = createSessionToken(newUser);
    res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions(req));
    res.status(201).json({
      authenticated: true,
      sessionToken: token,
      user: sanitizePublicUser(newUser),
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const opts = getCookieOptions(req);
    res.clearCookie(SESSION_COOKIE_NAME, {
      path: opts.path,
      sameSite: opts.sameSite,
      secure: opts.secure,
    });
    res.json({ authenticated: false });
  });

  // --- Customer Account & Enquiries ---
  app.patch('/api/customer/profile', requireAuth, (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const company = typeof req.body?.company === 'string' ? req.body.company.trim() : '';
    const prefs = req.body?.notificationPreferences;

    if (name.length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }

    const updated = updateDb((state) => {
      const target = state.users.find((u) => u.id === req.user.id);
      if (!target) return null;
      target.name = name;
      if (company) target.company = company;
      if (prefs && typeof prefs === 'object') {
        target.notificationPreferences = {
          productUpdates: Boolean(prefs.productUpdates),
          enquiryReplies: Boolean(prefs.enquiryReplies),
        };
      }
      return target;
    });

    if (!updated) {
      return res.status(404).json({ error: 'Account record not found.' });
    }
    res.json({ user: sanitizePublicUser(updated) });
  });

  app.get('/api/customer/enquiries', requireAuth, (req, res) => {
    const db = readDb();
    const userEnquiries = db.enquiries
      .filter(
        (e) =>
          e.userId === req.user.id ||
          e.email.toLowerCase() === req.user.email.toLowerCase()
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ enquiries: userEnquiries });
  });

  app.post('/api/contact', (req, res) => {
    const validation = validateContactEnquiry(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Please check the contact form fields and try again.',
        fieldErrors: validation.errors,
      });
    }

    const { name, email, company, subject, message } = validation.cleaned;
    const record = {
      id: `enq_${crypto.randomBytes(6).toString('hex')}`,
      userId: req.user ? req.user.id : null,
      name,
      email,
      company: company || 'Not specified',
      subject,
      message,
      status: 'Received',
      createdAt: new Date().toISOString(),
    };

    updateDb((state) => {
      state.enquiries.unshift(record);
    });

    res.status(201).json({
      enquiry: record,
      message: 'Your enquiry has been recorded. A NovaTech specialist will respond within one business day.',
    });
  });

  // --- Public Insights Endpoints (Strictly Approved & Published Only) ---
  app.get('/api/insights', (req, res) => {
    const db = readDb();
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const tag = typeof req.query.tag === 'string' ? req.query.tag.trim().toLowerCase() : '';
    const query = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const featuredOnly = req.query.featured === 'true';
    const excludeFeatured = req.query.excludeFeatured === 'true';

    const allPublished = db.insights
      .filter(isPubliclyPublishable)
      .map(sanitizePublicArticle)
      .filter(Boolean)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    const categories = Array.from(new Set(allPublished.map((a) => a.category)));
    const tags = Array.from(
      new Set(allPublished.flatMap((a) => (Array.isArray(a.tags) ? a.tags : [])))
    );

    const featuredArticle =
      allPublished.find((a) => a.featured || a.isFeatured) || allPublished[0] || null;

    let articles = allPublished;

    if (category && category !== 'All') {
      articles = articles.filter((a) => a.category === category);
    }
    if (tag) {
      articles = articles.filter(
        (a) => Array.isArray(a.tags) && a.tags.some((t) => t.toLowerCase() === tag)
      );
    }
    if (featuredOnly) {
      articles = articles.filter((a) => a.featured || a.isFeatured).slice(0, 3);
    }
    if (query) {
      articles = articles.filter((a) => {
        const tagText = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
        return (
          a.title.toLowerCase().includes(query) ||
          (a.excerpt || a.summary || '').toLowerCase().includes(query) ||
          (a.content || '').toLowerCase().includes(query) ||
          a.category.toLowerCase().includes(query) ||
          a.authorName.toLowerCase().includes(query) ||
          tagText.includes(query)
        );
      });
    }

    const isDefaultUnfiltered =
      (!category || category === 'All') && !tag && !query && !featuredOnly;
    if (excludeFeatured && isDefaultUnfiltered && featuredArticle) {
      articles = articles.filter((a) => a.id !== featuredArticle.id);
    }

    const total = articles.length;
    const rawLimit = req.query.limit ? Number(req.query.limit) : 0;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 0;
    const rawPage = req.query.page ? Number(req.query.page) : 1;
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

    let paginatedArticles = articles;
    let totalPages = 1;
    let hasMore = false;

    if (limit > 0) {
      totalPages = Math.max(1, Math.ceil(total / limit));
      const offset = (page - 1) * limit;
      paginatedArticles = articles.slice(offset, offset + limit);
      hasMore = offset + paginatedArticles.length < total;
    }

    res.json({
      articles: paginatedArticles,
      featuredArticle: isDefaultUnfiltered ? featuredArticle : null,
      categories,
      tags,
      total,
      page,
      limit: limit || total,
      totalPages,
      hasMore,
    });
  });

  app.get('/api/insights/:slug', (req, res) => {
    const db = readDb();
    const found = db.insights.find((item) => item.slug === req.params.slug);
    if (!found || !isPubliclyPublishable(found)) {
      return res.status(404).json({
        error: 'Article not found or not authorized for public publication.',
      });
    }
    const foundTags = new Set((found.tags || []).map((t) => t.toLowerCase()));
    const related = db.insights
      .filter((item) => item.id !== found.id && isPubliclyPublishable(item))
      .map((item) => {
        const sharedTagCount = (item.tags || []).filter((t) =>
          foundTags.has(t.toLowerCase())
        ).length;
        const score = (item.category === found.category ? 3 : 0) + sharedTagCount * 2;
        return { item: sanitizePublicArticle(item), score };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.item.publishedAt) - new Date(a.item.publishedAt);
      })
      .slice(0, 3)
      .map((entry) => entry.item);

    res.json({
      article: sanitizePublicArticle(found),
      related,
    });
  });

  // --- Internal Blog Management & BrandOS Workflow Endpoints ---
  app.get('/api/blog/manage', requireEmployee, (req, res) => {
    const db = readDb();
    const articles = db.insights
      .filter((i) => !i.isDeleted)
      .map(sanitizeManagedArticle)
      .filter(Boolean)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

    const stats = {
      total: articles.length,
      published: articles.filter((a) => a.isPublic).length,
      draftsAndReview: articles.filter((a) =>
        ['draft', 'under_review', 'changes_requested', 'rejected'].includes(a.status)
      ).length,
      unpublished: articles.filter((a) => a.status === 'unpublished').length,
    };

    res.json({
      stats,
      articles,
      permissions: getArticlePermissions(req.user),
      categories: INSIGHT_CATEGORIES,
      coverLibrary: COVER_IMAGE_LIBRARY,
    });
  });

  app.get('/api/blog/manage/:id', requireEmployee, (req, res) => {
    const db = readDb();
    const found = db.insights.find((i) => i.id === req.params.id && !i.isDeleted);
    if (!found) {
      return res.status(404).json({ error: 'Article record not found.' });
    }
    const history = db.publicationHistory
      .filter((h) => h.articleId === found.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      article: sanitizeManagedArticle(found),
      history,
      permissions: getArticlePermissions(req.user),
      categories: INSIGHT_CATEGORIES,
      coverLibrary: COVER_IMAGE_LIBRARY,
    });
  });

  app.post('/api/blog/manage', requireEmployee, (req, res) => {
    const db = readDb();
    const validation = validateArticlePayload(req.body, db.insights, null);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Please review the highlighted article fields.',
        fieldErrors: validation.errors,
      });
    }

    const coverImage = validation.cleaned.coverImage;
    if (coverImage.startsWith('data:image/') && coverImage.length > 3 * 1024 * 1024) {
      return res.status(400).json({
        error: 'Uploaded cover image exceeds the 2MB inline limit.',
        fieldErrors: { coverImage: 'Please choose an image smaller than 2MB.' },
      });
    }

    const now = new Date().toISOString();
    const submissionCode = `BOS-${new Date().getFullYear()}-${Math.floor(300 + Math.random() * 699)}`;
    const newRecord = {
      id: `ins_${crypto.randomBytes(6).toString('hex')}`,
      ...validation.cleaned,
      department: req.user.department || 'Marketing',
      authorName: req.user.name,
      authorRole: req.user.jobTitle || req.user.brandosRole || 'Contributor',
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
      featured: false,
      isFeatured: false,
      isSeedDemo: false,
      status: 'draft',
      publicationStatus: 'draft',
      approvalStatus: 'pending',
      requiredClaimsVerified: false,
      brandosSubmissionId: submissionCode,
      approvedBy: null,
      publishedBy: null,
      reviewNotes:
        typeof req.body?.reviewNotes === 'string' ? req.body.reviewNotes.trim() : '',
    };

    updateDb((state) => {
      state.insights.unshift(newRecord);
      state.publicationHistory.unshift({
        id: `pub_${crypto.randomBytes(5).toString('hex')}`,
        articleId: newRecord.id,
        articleTitle: newRecord.title,
        brandosSubmissionId: newRecord.brandosSubmissionId,
        action: 'Draft Created',
        actorName: req.user.name,
        department: newRecord.department,
        timestamp: now,
      });
    });

    res.status(201).json({
      article: sanitizeManagedArticle(newRecord),
    });
  });

  app.patch('/api/blog/manage/:id', requireEmployee, (req, res) => {
    const targetId = req.params.id;
    const db = readDb();
    const existing = db.insights.find((i) => i.id === targetId && !i.isDeleted);
    if (!existing) {
      return res.status(404).json({ error: 'Article record not found.' });
    }

    const validation = validateArticlePayload(req.body, db.insights, targetId);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Please review the highlighted article fields.',
        fieldErrors: validation.errors,
      });
    }

    const { cleaned } = validation;
    if (cleaned.coverImage.startsWith('data:image/') && cleaned.coverImage.length > 3 * 1024 * 1024) {
      return res.status(400).json({
        error: 'Uploaded cover image exceeds the 2MB inline limit.',
        fieldErrors: { coverImage: 'Please choose an image smaller than 2MB.' },
      });
    }

    const substantiveChanged =
      existing.title !== cleaned.title ||
      existing.slug !== cleaned.slug ||
      (existing.excerpt || existing.summary || '') !== cleaned.excerpt ||
      existing.content !== cleaned.content ||
      existing.category !== cleaned.category ||
      existing.coverImage !== cleaned.coverImage ||
      JSON.stringify(existing.tags || []) !== JSON.stringify(cleaned.tags);

    const requestedFeatured =
      typeof req.body?.featured === 'boolean'
        ? req.body.featured
        : typeof req.body?.isFeatured === 'boolean'
          ? req.body.isFeatured
          : Boolean(existing.featured ?? existing.isFeatured);

    if (
      requestedFeatured !== Boolean(existing.featured ?? existing.isFeatured) &&
      !canManagePublications(req.user)
    ) {
      return res.status(403).json({
        error: 'Only BrandOS Publishers or Admins can change featured article placement.',
      });
    }

    const now = new Date().toISOString();
    let requiresReapproval = false;

    const updated = updateDb((state) => {
      const item = state.insights.find((i) => i.id === targetId);
      if (!item) return null;

      item.title = cleaned.title;
      item.slug = cleaned.slug;
      item.excerpt = cleaned.excerpt;
      item.summary = cleaned.excerpt;
      item.content = cleaned.content;
      item.category = cleaned.category;
      item.tags = cleaned.tags;
      item.coverImage = cleaned.coverImage;
      item.seoTitle = cleaned.seoTitle;
      item.seoDescription = cleaned.seoDescription;
      item.readingTime = cleaned.readingTime;
      item.readTime = cleaned.readingTime;
      item.updatedAt = now;

      if (canManagePublications(req.user)) {
        item.featured = requestedFeatured;
        item.isFeatured = requestedFeatured;
      }

      if (typeof req.body?.reviewNotes === 'string') {
        item.reviewNotes = req.body.reviewNotes.trim();
      }

      // Preserve BrandOS governance: substantive edits to a live published article
      // move it back into review until claims & manager approval are re-confirmed.
      if (item.status === 'published' && substantiveChanged) {
        requiresReapproval = true;
        item.status = 'under_review';
        item.publicationStatus = 'under_review';
        item.approvalStatus = 'pending';
        item.requiredClaimsVerified = false;
        item.approvedBy = null;
        item.publishedBy = null;
        item.publishedAt = null;
        item.reviewNotes =
          'Substantive edit saved on published article — BrandOS Claim Ledger and manager re-approval required before republishing.';
        state.publicationHistory.unshift({
          id: `pub_${crypto.randomBytes(5).toString('hex')}`,
          articleId: item.id,
          articleTitle: item.title,
          brandosSubmissionId: item.brandosSubmissionId,
          action: 'Edited (Re-review Required)',
          actorName: req.user.name,
          department: item.department,
          timestamp: now,
        });
      } else {
        state.publicationHistory.unshift({
          id: `pub_${crypto.randomBytes(5).toString('hex')}`,
          articleId: item.id,
          articleTitle: item.title,
          brandosSubmissionId: item.brandosSubmissionId,
          action: 'Updated',
          actorName: req.user.name,
          department: item.department,
          timestamp: now,
        });
      }

      return item;
    });

    res.json({
      article: sanitizeManagedArticle(updated),
      requiresReapproval,
    });
  });

  app.post('/api/blog/manage/:id/workflow', requireEmployee, (req, res) => {
    const targetId = req.params.id;
    const action = typeof req.body?.action === 'string' ? req.body.action.trim() : '';
    const notes = typeof req.body?.reviewNotes === 'string' ? req.body.reviewNotes.trim() : '';

    const db = readDb();
    const existing = db.insights.find((i) => i.id === targetId && !i.isDeleted);
    if (!existing) {
      return res.status(404).json({ error: 'Article record not found.' });
    }

    const validActions = [
      'submit_review',
      'verify_claims',
      'request_changes',
      'reject',
      'approve',
      'publish',
      'unpublish',
    ];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Unsupported BrandOS workflow action.' });
    }

    if (action === 'verify_claims' && !canVerifyClaims(req.user)) {
      return res.status(403).json({
        error: 'Reviewer, Manager, Publisher, or Admin role required to verify Claim Ledger items.',
      });
    }
    if (action === 'request_changes' && !canVerifyClaims(req.user)) {
      return res.status(403).json({
        error: 'Reviewer or higher BrandOS role required to request revisions.',
      });
    }
    if ((action === 'approve' || action === 'reject') && !canApproveContent(req.user)) {
      return res.status(403).json({
        error: 'BrandOS Manager, Publisher, or Admin role required for formal approval decisions.',
      });
    }
    if ((action === 'publish' || action === 'unpublish') && !canManagePublications(req.user)) {
      return res.status(403).json({
        error: 'BrandOS Publisher or Admin role required to publish or unpublish articles.',
      });
    }
    if (action === 'approve' && existing.requiredClaimsVerified !== true) {
      return res.status(400).json({
        error: 'Claim Ledger verification must be completed before Manager approval.',
      });
    }
    if (
      action === 'publish' &&
      (existing.approvalStatus !== 'approved' || existing.requiredClaimsVerified !== true)
    ) {
      return res.status(400).json({
        error:
          'Publication blocked by BrandOS gate: article requires Claim Ledger verification and Manager approval first.',
      });
    }

    const now = new Date().toISOString();
    const updated = updateDb((state) => {
      const item = state.insights.find((i) => i.id === targetId);
      if (!item) return null;

      let historyAction = 'Workflow Updated';

      if (action === 'submit_review') {
        item.status = 'under_review';
        item.publicationStatus = 'under_review';
        item.approvalStatus = 'pending';
        item.publishedAt = null;
        if (notes) item.reviewNotes = notes;
        historyAction = 'Submitted for Review';
      } else if (action === 'verify_claims') {
        item.requiredClaimsVerified = true;
        if (item.status === 'draft' || item.status === 'changes_requested') {
          item.status = 'under_review';
          item.publicationStatus = 'under_review';
          item.approvalStatus = 'pending';
        }
        if (notes) item.reviewNotes = notes;
        historyAction = 'Claim Ledger Verified';
      } else if (action === 'request_changes') {
        item.status = 'changes_requested';
        item.publicationStatus = 'changes_requested';
        item.approvalStatus = 'changes_requested';
        item.requiredClaimsVerified = false;
        item.approvedBy = null;
        item.publishedAt = null;
        item.reviewNotes = notes || 'Returned for Claim Ledger or editorial revisions.';
        historyAction = 'Changes Requested';
      } else if (action === 'reject') {
        item.status = 'rejected';
        item.publicationStatus = 'rejected';
        item.approvalStatus = 'rejected';
        item.requiredClaimsVerified = false;
        item.approvedBy = null;
        item.publishedAt = null;
        item.reviewNotes = notes || 'Submission rejected during BrandOS review.';
        historyAction = 'Rejected';
      } else if (action === 'approve') {
        item.approvalStatus = 'approved';
        item.approvedBy = req.user.name;
        if (item.status !== 'published' && item.status !== 'unpublished') {
          item.status = 'approved';
          item.publicationStatus = 'approved';
        }
        if (notes) item.reviewNotes = notes;
        historyAction = 'Approved in BrandOS';
      } else if (action === 'publish') {
        const wasUnpublished = item.status === 'unpublished';
        item.status = 'published';
        item.publicationStatus = 'published';
        item.publishedBy = req.user.name;
        item.publishedAt = now;
        historyAction = wasUnpublished ? 'Republished' : 'Published';
      } else if (action === 'unpublish') {
        item.status = 'unpublished';
        item.publicationStatus = 'unpublished';
        item.publishedAt = null;
        historyAction = 'Unpublished';
      }

      item.updatedAt = now;
      state.publicationHistory.unshift({
        id: `pub_${crypto.randomBytes(5).toString('hex')}`,
        articleId: item.id,
        articleTitle: item.title,
        brandosSubmissionId: item.brandosSubmissionId || 'N/A',
        action: historyAction,
        actorName: req.user.name,
        department: item.department,
        timestamp: now,
      });

      return item;
    });

    res.json({ article: sanitizeManagedArticle(updated) });
  });

  app.delete('/api/blog/manage/:id', requireEmployee, (req, res) => {
    if (!canDeleteArticles(req.user)) {
      return res.status(403).json({
        error: 'BrandOS Publisher or Admin permissions are required to permanently delete articles.',
      });
    }

    const targetId = req.params.id;
    const deleted = updateDb((state) => {
      const idx = state.insights.findIndex((i) => i.id === targetId);
      if (idx === -1) return null;
      const [removed] = state.insights.splice(idx, 1);

      if (!Array.isArray(state.deletedSeedIds)) {
        state.deletedSeedIds = [];
      }
      if (!state.deletedSeedIds.includes(removed.id)) {
        state.deletedSeedIds.push(removed.id);
      }

      // Clean up orphaned article history references so there are zero dangling links
      state.publicationHistory = state.publicationHistory.filter(
        (h) => h.articleId !== removed.id
      );

      return removed;
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Article record not found.' });
    }

    res.json({ deleted: true, id: targetId, title: deleted.title });
  });

  // --- Employee Dashboard & BrandOS Integration Endpoints ---
  app.get('/api/employee/dashboard', requireEmployee, async (req, res) => {
    const db = readDb();
    const brandosUrl = getConfiguredBrandosUrl();
    const health = await probeBrandosHealth(getConfiguredBrandosApiUrl());

    const allInternalPosts = db.insights.filter((i) => !i.isDeleted);
    const departmentPosts = allInternalPosts.filter(
      (i) => i.department === req.user.department || isAdmin(req.user)
    );

    const recentSubmissions = departmentPosts.map((i) => ({
      id: i.id,
      title: i.title,
      department: i.department,
      status: i.status,
      approvalStatus: i.approvalStatus,
      requiredClaimsVerified: i.requiredClaimsVerified,
      brandosSubmissionId: i.brandosSubmissionId,
      authorName: i.authorName,
      publishedAt: i.publishedAt,
      slug: i.slug,
    }));

    const reviewerEnabled = canReviewApprovals(req.user);
    const pendingApprovals = reviewerEnabled
      ? allInternalPosts
          .filter((i) => i.status === 'under_review' || i.status === 'draft')
          .map((i) => ({
            id: i.id,
            title: i.title,
            department: i.department,
            status: i.status,
            brandosSubmissionId: i.brandosSubmissionId,
            authorName: i.authorName,
          }))
      : [];

    const approvedCount = departmentPosts.filter(
      (i) => i.approvalStatus === 'approved' && i.status === 'published'
    ).length;
    const changesRequestedCount = departmentPosts.filter(
      (i) => i.status === 'changes_requested' || i.approvalStatus === 'changes_requested'
    ).length;

    const recentActivity = db.publicationHistory
      .slice()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 8);

    res.json({
      employee: sanitizePublicUser(req.user),
      canReviewApprovals: reviewerEnabled,
      stats: {
        totalSubmissions: recentSubmissions.length,
        pendingApprovals: pendingApprovals.length,
        approvedContent: approvedCount,
        changesRequested: changesRequestedCount,
      },
      recentSubmissions,
      pendingApprovals,
      recentActivity,
      brandos: {
        configuredUrl: brandosUrl || null,
        configured: health.configured,
        reachable: health.reachable,
        reason: health.reason || null,
      },
    });
  });

  app.get('/api/brandos/config', requireEmployee, async (_req, res) => {
    const brandosUrl = getConfiguredBrandosUrl();
    const health = await probeBrandosHealth(getConfiguredBrandosApiUrl());
    res.json({
      configuredUrl: brandosUrl || null,
      configured: health.configured,
      reachable: health.reachable,
      reason: health.reason || null,
      ssoExchangeEndpoint: '/api/brandos/sso/exchange',
      publishWebhookEndpoint: '/api/brandos/publish',
    });
  });

  app.post('/api/brandos/sso-ticket', requireEmployee, async (req, res) => {
    const targetRoute =
      typeof req.body?.targetRoute === 'string' && req.body.targetRoute.startsWith('/')
        ? req.body.targetRoute
        : '/submissions/new';

    const brandosUrl = getConfiguredBrandosUrl();
    if (!brandosUrl) {
      return res.status(503).json({
        code: 'BRANDOS_NOT_CONFIGURED',
        error:
          'BrandOS integration URL is not configured. Set BRANDOS_URL and VITE_BRANDOS_URL to connect your BrandOS instance.',
        employee: {
          name: req.user.name,
          department: req.user.department,
          brandosRole: req.user.brandosRole,
        },
      });
    }

    const health = await probeBrandosHealth(getConfiguredBrandosApiUrl());
    if (!health.reachable) {
      return res.status(502).json({
        code: 'BRANDOS_UNREACHABLE',
        configuredUrl: brandosUrl,
        error:
          health.reason ||
          `The BrandOS application at ${brandosUrl} is currently unreachable. Start BrandOS to complete secure SSO authentication.`,
        employee: {
          name: req.user.name,
          department: req.user.department,
          brandosRole: req.user.brandosRole,
        },
        ssoContract: {
          exchangeEndpoint: '/api/brandos/sso/exchange',
          publishEndpoint: '/api/brandos/publish',
          targetRoute,
        },
      });
    }

    const ticket = issueSsoTicket(req.user, targetRoute);
    const redirectUrl = buildBrandosHandoffUrl(brandosUrl, ticket.code, targetRoute);
    if (!redirectUrl) {
      return res.status(500).json({
        code: 'BRANDOS_INVALID_URL',
        error: 'Configured BrandOS URL is invalid.',
      });
    }

    res.json({
      reachable: true,
      redirectUrl,
      expiresAt: ticket.expiresAt,
      department: req.user.department,
      brandosRole: req.user.brandosRole,
      targetRoute,
    });
  });

  // Server-to-server SSO ticket verification endpoint for BrandOS
  app.post('/api/brandos/sso/exchange', (req, res) => {
    const secret = req.headers['x-brandos-secret'];
    if (process.env.BRANDOS_SSO_SHARED_SECRET && !verifyBrandosSharedSecret(secret)) {
      return res.status(401).json({ error: 'Invalid BrandOS shared secret.' });
    }

    const ticketCode = typeof req.body?.sso_ticket === 'string' ? req.body.sso_ticket : '';
    const entry = consumeSsoTicket(ticketCode);
    if (!entry) {
      return res.status(401).json({ error: 'Invalid or expired BrandOS SSO ticket.' });
    }

    res.json({
      verified: true,
      identity: {
        userId: entry.userId,
        email: entry.email,
        name: entry.name,
        websiteRole: entry.websiteRole,
        department: entry.department,
        brandosRole: entry.brandosRole,
      },
      targetRoute: entry.targetRoute,
    });
  });

  // BrandOS authorized publication webhook / endpoint
  app.post('/api/brandos/publish', (req, res) => {
    const secretHeader = req.headers['x-brandos-secret'];
    const authorizedBySecret =
      Boolean(process.env.BRANDOS_SSO_SHARED_SECRET) &&
      verifyBrandosSharedSecret(secretHeader);
    const authorizedBySession = req.user && isEmployeeOrAdmin(req.user) && canReviewApprovals(req.user);

    if (!authorizedBySecret && !authorizedBySession) {
      return res.status(403).json({
        error: 'Unauthorized publication attempt. Valid BrandOS secret or authorized publisher session required.',
      });
    }

    const payload = req.body || {};
    const title = typeof payload.title === 'string' ? payload.title.trim() : '';
    const summary = typeof payload.summary === 'string' ? payload.summary.trim() : '';
    const content = typeof payload.content === 'string' ? payload.content.trim() : '';
    const category = typeof payload.category === 'string' ? payload.category.trim() : 'AI & Automation';
    const department = typeof payload.department === 'string' ? payload.department.trim() : 'Marketing';
    const brandosSubmissionId =
      typeof payload.brandosSubmissionId === 'string' ? payload.brandosSubmissionId.trim() : '';
    const approvedBy = typeof payload.approvedBy === 'string' ? payload.approvedBy.trim() : '';
    const publishedBy =
      typeof payload.publishedBy === 'string' && payload.publishedBy.trim()
        ? payload.publishedBy.trim()
        : req.user?.name || '';

    const candidate = {
      status: payload.status || 'published',
      approvalStatus: payload.approvalStatus,
      requiredClaimsVerified: payload.requiredClaimsVerified === true,
      brandosSubmissionId,
      approvedBy,
      publishedBy,
      publishedAt: payload.publishedAt || new Date().toISOString(),
    };

    if (!title || !summary || !content || !isPubliclyPublishable(candidate)) {
      return res.status(400).json({
        error:
          'Publication rejected by BrandOS governance gate. Submission must have approved status, verified claims, valid submission ID, and authorized approver/publisher.',
      });
    }

    const baseSlug = slugifyTitle(title) || `insight-${Date.now()}`;
    const excerpt = typeof payload.excerpt === 'string' && payload.excerpt.trim()
      ? payload.excerpt.trim()
      : summary;
    const readingTime = payload.readingTime || payload.readTime || calculateReadingTime(content);
    const featured = Boolean(payload.featured ?? payload.isFeatured);
    const now = new Date().toISOString();
    const newRecord = {
      id: `ins_${crypto.randomBytes(6).toString('hex')}`,
      slug: baseSlug,
      title,
      summary: excerpt,
      excerpt,
      content,
      category,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      department,
      authorName: payload.authorName || req.user?.name || 'NovaTech Editorial',
      authorRole: payload.authorRole || department,
      coverImage: payload.coverImage || '/src/assets/images/insight_ai_workflows_1794980382417.jpg',
      readTime: readingTime,
      readingTime,
      seoTitle: payload.seoTitle || title,
      seoDescription: payload.seoDescription || excerpt,
      publishedAt: candidate.publishedAt,
      createdAt: now,
      updatedAt: now,
      featured,
      isFeatured: featured,
      isSeedDemo: false,
      status: 'published',
      publicationStatus: 'published',
      approvalStatus: 'approved',
      requiredClaimsVerified: true,
      brandosSubmissionId,
      approvedBy,
      publishedBy,
    };

    updateDb((state) => {
      if (state.insights.some((i) => i.slug === newRecord.slug)) {
        newRecord.slug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
      }
      state.insights.unshift(newRecord);
      state.publicationHistory.unshift({
        id: `pub_${crypto.randomBytes(5).toString('hex')}`,
        articleId: newRecord.id,
        articleTitle: newRecord.title,
        brandosSubmissionId: newRecord.brandosSubmissionId,
        action: 'Published',
        actorName: publishedBy,
        department,
        timestamp: new Date().toISOString(),
      });
    });

    res.status(201).json({
      published: true,
      article: sanitizePublicArticle(newRecord),
    });
  });

  // --- Admin Endpoints ---
  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const db = readDb();
    res.json({
      users: db.users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        websiteRole: u.websiteRole,
        company: u.company,
        department: u.department,
        brandosRole: u.brandosRole,
        jobTitle: u.jobTitle,
        isActive: u.isActive !== false,
        isDemoAccount: Boolean(u.isDemoAccount),
        createdAt: u.createdAt,
      })),
      contentRecords: db.insights.map((i) => ({
        id: i.id,
        slug: i.slug,
        title: i.title,
        category: i.category,
        department: i.department,
        authorName: i.authorName,
        status: i.status,
        approvalStatus: i.approvalStatus,
        requiredClaimsVerified: Boolean(i.requiredClaimsVerified),
        brandosSubmissionId: i.brandosSubmissionId,
        approvedBy: i.approvedBy,
        publishedBy: i.publishedBy,
        publishedAt: i.publishedAt,
        isSeedDemo: Boolean(i.isSeedDemo),
        isPublic: isPubliclyPublishable(i),
      })),
      publicationHistory: db.publicationHistory
        .slice()
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      enquiries: db.enquiries
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      metadata: {
        departments: DEPARTMENTS,
        brandosRoles: BRANDOS_ROLES,
      },
    });
  });

  app.patch('/api/admin/users/:id', requireAdmin, (req, res) => {
    const targetId = req.params.id;
    const { websiteRole, department, brandosRole, isActive, jobTitle } = req.body || {};

    if (
      websiteRole &&
      ![WEBSITE_ROLES.CUSTOMER, WEBSITE_ROLES.EMPLOYEE, WEBSITE_ROLES.ADMIN].includes(websiteRole)
    ) {
      return res.status(400).json({ error: 'Invalid website role specified.' });
    }
    if (department && !DEPARTMENTS.includes(department)) {
      return res.status(400).json({ error: 'Invalid department specified.' });
    }
    if (brandosRole && !BRANDOS_ROLES.includes(brandosRole)) {
      return res.status(400).json({ error: 'Invalid BrandOS role specified.' });
    }
    if (targetId === req.user.id && (isActive === false || (websiteRole && websiteRole !== 'admin'))) {
      return res.status(400).json({
        error: 'You cannot deactivate or demote your own active administrator account.',
      });
    }

    const updated = updateDb((state) => {
      const user = state.users.find((u) => u.id === targetId);
      if (!user) return null;

      if (websiteRole) user.websiteRole = websiteRole;
      if (typeof isActive === 'boolean') user.isActive = isActive;

      if (user.websiteRole === WEBSITE_ROLES.CUSTOMER) {
        user.department = null;
        user.brandosRole = null;
        user.jobTitle = null;
      } else {
        if (department) user.department = department;
        if (brandosRole) user.brandosRole = brandosRole;
        if (typeof jobTitle === 'string') user.jobTitle = jobTitle.trim();
        if (!user.department) user.department = 'Marketing';
        if (!user.brandosRole) user.brandosRole = 'Creator';
      }
      return user;
    });

    if (!updated) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        websiteRole: updated.websiteRole,
        company: updated.company,
        department: updated.department,
        brandosRole: updated.brandosRole,
        jobTitle: updated.jobTitle,
        isActive: updated.isActive !== false,
      },
    });
  });

  app.post('/api/admin/insights/:id/unpublish', requireAdmin, (req, res) => {
    const targetId = req.params.id;
    const now = new Date().toISOString();
    const result = updateDb((state) => {
      const item = state.insights.find((i) => i.id === targetId);
      if (!item) return { notFound: true };
      item.status = 'unpublished';
      item.publicationStatus = 'unpublished';
      item.publishedAt = null;
      item.updatedAt = now;
      state.publicationHistory.unshift({
        id: `pub_${crypto.randomBytes(5).toString('hex')}`,
        articleId: item.id,
        articleTitle: item.title,
        brandosSubmissionId: item.brandosSubmissionId || 'N/A',
        action: 'Unpublished',
        actorName: req.user.name,
        department: item.department,
        timestamp: now,
      });
      return { item };
    });

    if (result.notFound) {
      return res.status(404).json({ error: 'Content record not found.' });
    }
    res.json({ status: 'unpublished', id: targetId });
  });

  app.post('/api/admin/insights/:id/publish', requireAdmin, (req, res) => {
    const targetId = req.params.id;
    const db = readDb();
    const existing = db.insights.find((i) => i.id === targetId);
    if (!existing) {
      return res.status(404).json({ error: 'Content record not found.' });
    }

    if (existing.approvalStatus !== 'approved' || existing.requiredClaimsVerified !== true) {
      return res.status(400).json({
        error:
          'Cannot publish unapproved content. BrandOS manager approval and Claim Ledger verification must be completed in BrandOS first.',
      });
    }

    const now = new Date().toISOString();
    updateDb((state) => {
      const item = state.insights.find((i) => i.id === targetId);
      item.status = 'published';
      item.publicationStatus = 'published';
      item.publishedBy = req.user.name;
      item.publishedAt = now;
      item.updatedAt = now;
      state.publicationHistory.unshift({
        id: `pub_${crypto.randomBytes(5).toString('hex')}`,
        articleId: item.id,
        articleTitle: item.title,
        brandosSubmissionId: item.brandosSubmissionId,
        action: 'Republished',
        actorName: req.user.name,
        department: item.department,
        timestamp: now,
      });
    });

    res.json({ status: 'published', id: targetId });
  });

  // --- Vite Dev Middleware or Production Static Assets ---
  const distDir = path.resolve(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);

  if (isProd) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NovaTech server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start NovaTech server:', err);
  process.exit(1);
});
