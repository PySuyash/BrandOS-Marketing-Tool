import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
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
} from '../db/schema.js';
import {
  canAccessDepartment,
  clearSessionCookie,
  hashPassword,
  requireAuth,
  requireRole,
  setSessionCookie,
  signSessionToken,
  verifyPassword,
} from './auth.js';
import { runReviewForSubmission } from './reviewEngine.js';
import { getDemoPassword, seedDatabaseIfEmpty } from '../db/seed.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const apiRouter = express.Router();

apiRouter.get('/auth/demo-accounts', async (_req, res) => {
  try {
    await seedDatabaseIfEmpty();
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        title: users.title,
        departmentId: users.departmentId,
        departmentName: departments.name,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .orderBy(users.id);

    const demoUsers = rows.filter((u) => u.email.endsWith('@brandos.demo'));
    res.json({
      accounts: demoUsers,
      demoPasswordHint: getDemoPassword(),
    });
  } catch (err) {
    console.error('Failed to fetch demo accounts:', err);
    res.status(500).json({ error: 'Unable to load demo accounts.' });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const rows = await db
      .select({
        id: users.id,
        uid: users.uid,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
        role: users.role,
        departmentId: users.departmentId,
        title: users.title,
        departmentName: departments.name,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);

    const found = rows[0];
    if (!found || !found.passwordHash) {
      return res.status(401).json({ error: 'Invalid employee credentials.' });
    }

    const ok = await verifyPassword(password, found.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid employee credentials.' });
    }

    const authUser = {
      id: found.id,
      uid: found.uid,
      name: found.name,
      email: found.email,
      role: found.role,
      departmentId: found.departmentId,
      departmentName: found.departmentName ?? null,
      title: found.title,
    };

    const token = signSessionToken(authUser);
    setSessionCookie(res, token);

    await db.insert(auditLogs).values({
      userId: authUser.id,
      action: 'USER_LOGIN',
      details: `${authUser.email} (${authUser.role}) logged in.`,
    });

    res.json({ user: authUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication failed.' });
  }
});

apiRouter.post('/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

apiRouter.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.authUser });
});

apiRouter.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const user = req.authUser;
    const allDepts = await db.select().from(departments).orderBy(departments.id);

    const allSubs = await db
      .select({
        id: submissions.id,
        title: submissions.title,
        creatorId: submissions.creatorId,
        departmentId: submissions.departmentId,
        departmentName: departments.name,
        contentType: submissions.contentType,
        channel: submissions.channel,
        status: submissions.status,
        currentVersion: submissions.currentVersion,
        updatedAt: submissions.updatedAt,
        creatorName: users.name,
      })
      .from(submissions)
      .leftJoin(departments, eq(submissions.departmentId, departments.id))
      .leftJoin(users, eq(submissions.creatorId, users.id))
      .orderBy(desc(submissions.updatedAt));

    const visibleSubs =
      user.role === 'Admin' || user.role === 'Reviewer'
        ? allSubs
        : allSubs.filter((s) => s.departmentId === user.departmentId);

    const visibleSubIds = visibleSubs.map((s) => s.id);

    const allClaims =
      visibleSubIds.length > 0
        ? await db
            .select()
            .from(claims)
            .where(inArray(claims.submissionId, visibleSubIds))
        : [];

    const allFindings =
      visibleSubIds.length > 0
        ? await db
            .select()
            .from(findings)
            .where(inArray(findings.submissionId, visibleSubIds))
        : [];

    const recentLogs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        details: auditLogs.details,
        submissionId: auditLogs.submissionId,
        createdAt: auditLogs.createdAt,
        userName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(12);

    const deptStats = allDepts.map((dept) => {
      const dSubs = visibleSubs.filter((s) => s.departmentId === dept.id);
      const dIds = new Set(dSubs.map((s) => s.id));
      const dUnverified = allClaims.filter(
        (c) => dIds.has(c.submissionId) && c.verdict === 'UNVERIFIED'
      ).length;
      const dConflicts = allClaims.filter(
        (c) => dIds.has(c.submissionId) && c.verdict === 'CONFLICTS'
      ).length;
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        totalSubmissions: dSubs.length,
        approved: dSubs.filter((s) => s.status === 'Approved').length,
        pending: dSubs.filter((s) =>
          ['Under Review', 'Resubmitted'].includes(s.status)
        ).length,
        changesRequested: dSubs.filter((s) => s.status === 'Changes Requested')
          .length,
        unverifiedClaims: dUnverified,
        conflictingClaims: dConflicts,
      };
    });

    res.json({
      metrics: {
        totalSubmissions: visibleSubs.length,
        pendingReviews: visibleSubs.filter((s) =>
          ['Under Review', 'Resubmitted'].includes(s.status)
        ).length,
        approvedContent: visibleSubs.filter((s) => s.status === 'Approved')
          .length,
        changesRequested: visibleSubs.filter(
          (s) => s.status === 'Changes Requested'
        ).length,
        unverifiedClaims: allClaims.filter((c) => c.verdict === 'UNVERIFIED')
          .length,
        openBlockers: allFindings.filter(
          (f) => f.status === 'Open' && f.severity === 'Blocker'
        ).length,
      },
      departmentStats: deptStats,
      recentSubmissions: visibleSubs.slice(0, 6),
      recentActivity: recentLogs,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard statistics.' });
  }
});

apiRouter.get('/notifications', requireAuth, async (req, res) => {
  try {
    const user = req.authUser;
    const subRows = await db
      .select({
        id: submissions.id,
        title: submissions.title,
        status: submissions.status,
        departmentId: submissions.departmentId,
        creatorId: submissions.creatorId,
        updatedAt: submissions.updatedAt,
      })
      .from(submissions)
      .orderBy(desc(submissions.updatedAt));

    const notifications = [];

    for (const s of subRows) {
      if (
        user.role === 'Creator' &&
        s.creatorId === user.id &&
        s.status === 'Changes Requested'
      ) {
        notifications.push({
          id: `sub-${s.id}-changes`,
          submissionId: s.id,
          title: 'Changes requested',
          detail: s.title,
          link: `/submissions/${s.id}`,
          timestamp: s.updatedAt,
        });
      } else if (
        (user.role === 'Admin' ||
          (user.role === 'Manager' && s.departmentId === user.departmentId)) &&
        ['Under Review', 'Resubmitted'].includes(s.status)
      ) {
        notifications.push({
          id: `sub-${s.id}-review`,
          submissionId: s.id,
          title: 'Awaiting manager decision',
          detail: s.title,
          link: `/submissions/${s.id}`,
          timestamp: s.updatedAt,
        });
      }
    }

    if (user.role === 'Reviewer' || user.role === 'Admin') {
      const pendingClaims = await db
        .select({
          id: claims.id,
          claimText: claims.claimText,
          submissionId: claims.submissionId,
          createdAt: claims.createdAt,
        })
        .from(claims)
        .where(eq(claims.reviewerStatus, 'Pending Review'))
        .orderBy(desc(claims.createdAt))
        .limit(8);

      for (const c of pendingClaims) {
        notifications.push({
          id: `claim-${c.id}`,
          submissionId: c.submissionId,
          title: 'Claim needs verification',
          detail: c.claimText,
          link: `/submissions/${c.submissionId}`,
          timestamp: c.createdAt,
        });
      }
    }

    res.json({ notifications: notifications.slice(0, 20) });
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
});

apiRouter.get('/departments', requireAuth, async (_req, res) => {
  try {
    const rows = await db.select().from(departments).orderBy(departments.id);
    res.json({ departments: rows });
  } catch (err) {
    console.error('List departments error:', err);
    res.status(500).json({ error: 'Failed to load departments.' });
  }
});

apiRouter.post(
  '/departments',
  requireAuth,
  requireRole('Admin'),
  async (req, res) => {
    try {
      const { name, description, toneProfile, requiredMessaging } = req.body;
      if (!name || !description || !toneProfile) {
        return res.status(400).json({
          error: 'Department name, description, and tone profile are required.',
        });
      }
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const [created] = await db
        .insert(departments)
        .values({
          name: name.trim(),
          slug,
          description: description.trim(),
          toneProfile: toneProfile.trim(),
          requiredMessaging: (requiredMessaging || '').trim(),
        })
        .returning();

      await db.insert(auditLogs).values({
        userId: req.authUser.id,
        action: 'DEPARTMENT_CREATED',
        details: `Created department "${created.name}".`,
      });

      res.status(201).json({ department: created });
    } catch (err) {
      console.error('Create department error:', err);
      res.status(500).json({ error: 'Failed to create department.' });
    }
  }
);

apiRouter.get('/departments/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [dept] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);
    if (!dept) return res.status(404).json({ error: 'Department not found.' });
    res.json({ department: dept });
  } catch (err) {
    console.error('Get department error:', err);
    res.status(500).json({ error: 'Failed to load department.' });
  }
});

apiRouter.put(
  '/departments/:id',
  requireAuth,
  requireRole('Admin'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, description, toneProfile, requiredMessaging } = req.body;

      const [updated] = await db
        .update(departments)
        .set({
          ...(name ? { name: name.trim() } : {}),
          ...(description ? { description: description.trim() } : {}),
          ...(toneProfile ? { toneProfile: toneProfile.trim() } : {}),
          ...(requiredMessaging !== undefined
            ? { requiredMessaging: requiredMessaging.trim() }
            : {}),
        })
        .where(eq(departments.id, id))
        .returning();

      if (!updated) return res.status(404).json({ error: 'Department not found.' });
      res.json({ department: updated });
    } catch (err) {
      console.error('Update department error:', err);
      res.status(500).json({ error: 'Failed to update department.' });
    }
  }
);

apiRouter.get('/users', requireAuth, async (req, res) => {
  try {
    const user = req.authUser;
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        title: users.title,
        departmentId: users.departmentId,
        departmentName: departments.name,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .orderBy(users.id);

    const visible =
      user.role === 'Admin' || user.role === 'Reviewer'
        ? rows
        : rows.filter(
            (r) =>
              r.departmentId === user.departmentId ||
              r.role === 'Reviewer' ||
              r.role === 'Admin'
          );

    res.json({ users: visible });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to load team directory.' });
  }
});

apiRouter.post('/users', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const { name, email, role, departmentId, title, password } = req.body;
    if (!name || !email || !role) {
      return res
        .status(400)
        .json({ error: 'Name, email, and role are required.' });
    }
    const passwordHash = await hashPassword(password || getDemoPassword());
    const [created] = await db
      .insert(users)
      .values({
        uid: `emp-${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role,
        departmentId: departmentId || null,
        title: (title || 'Team Member').trim(),
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        departmentId: users.departmentId,
        title: users.title,
      });

    await db.insert(auditLogs).values({
      userId: req.authUser.id,
      action: 'USER_CREATED',
      details: `Created employee ${created.email} with role ${created.role}.`,
    });

    res.status(201).json({ user: created });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create employee.' });
  }
});

apiRouter.put(
  '/users/:id',
  requireAuth,
  requireRole('Admin'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { role, departmentId, title, name } = req.body;
      const [updated] = await db
        .update(users)
        .set({
          ...(role ? { role } : {}),
          ...(departmentId !== undefined ? { departmentId } : {}),
          ...(title ? { title: title.trim() } : {}),
          ...(name ? { name: name.trim() } : {}),
        })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          departmentId: users.departmentId,
          title: users.title,
        });

      if (!updated) return res.status(404).json({ error: 'User not found.' });

      await db.insert(auditLogs).values({
        userId: req.authUser.id,
        action: 'USER_UPDATED',
        details: `Updated ${updated.email} role/department assignment.`,
      });

      res.json({ user: updated });
    } catch (err) {
      console.error('Update user error:', err);
      res.status(500).json({ error: 'Failed to update employee.' });
    }
  }
);

apiRouter.get('/guidelines/:departmentId', requireAuth, async (req, res) => {
  try {
    const departmentId = Number(req.params.departmentId);
    if (!canAccessDepartment(req.authUser, departmentId)) {
      return res.status(403).json({
        error: 'Forbidden: You cannot access guidelines of another department.',
      });
    }
    const rows = await db
      .select()
      .from(guidelines)
      .where(eq(guidelines.departmentId, departmentId))
      .orderBy(guidelines.ruleCode);
    res.json({ guidelines: rows });
  } catch (err) {
    console.error('Get guidelines error:', err);
    res.status(500).json({ error: 'Failed to load department guidelines.' });
  }
});

apiRouter.post(
  '/guidelines',
  requireAuth,
  requireRole('Admin', 'Manager'),
  async (req, res) => {
    try {
      const body = req.body;
      if (
        !body.departmentId ||
        !body.title ||
        !body.description ||
        !body.ruleType
      ) {
        return res.status(400).json({
          error:
            'departmentId, title, description, and ruleType are required.',
        });
      }
      if (!canAccessDepartment(req.authUser, body.departmentId)) {
        return res.status(403).json({
          error: 'Forbidden: Cannot add guidelines to another department.',
        });
      }
      const code =
        body.ruleCode?.trim() ||
        `RULE-${body.departmentId}-${String(Date.now()).slice(-4)}`;

      const [created] = await db
        .insert(guidelines)
        .values({
          departmentId: body.departmentId,
          ruleCode: code,
          title: body.title.trim(),
          description: body.description.trim(),
          ruleType: body.ruleType,
          severity: body.severity || 'Major',
          preferredTerm: body.preferredTerm?.trim() || null,
          bannedTerm: body.bannedTerm?.trim() || null,
          toneProfile: body.toneProfile?.trim() || null,
          requiredPhrase: body.requiredPhrase?.trim() || null,
          status: body.status || 'Active',
        })
        .returning();

      res.status(201).json({ guideline: created });
    } catch (err) {
      console.error('Create guideline error:', err);
      res.status(500).json({ error: 'Failed to create guideline.' });
    }
  }
);

apiRouter.put(
  '/guidelines/:id',
  requireAuth,
  requireRole('Admin', 'Manager'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [existing] = await db
        .select()
        .from(guidelines)
        .where(eq(guidelines.id, id))
        .limit(1);
      if (!existing) return res.status(404).json({ error: 'Guideline not found.' });
      if (!canAccessDepartment(req.authUser, existing.departmentId)) {
        return res
          .status(403)
          .json({ error: 'Forbidden: Cross-department access denied.' });
      }

      const body = req.body;
      const [updated] = await db
        .update(guidelines)
        .set({
          title: body.title ?? existing.title,
          description: body.description ?? existing.description,
          ruleType: body.ruleType ?? existing.ruleType,
          severity: body.severity ?? existing.severity,
          preferredTerm:
            body.preferredTerm !== undefined
              ? body.preferredTerm
              : existing.preferredTerm,
          bannedTerm:
            body.bannedTerm !== undefined
              ? body.bannedTerm
              : existing.bannedTerm,
          toneProfile:
            body.toneProfile !== undefined
              ? body.toneProfile
              : existing.toneProfile,
          requiredPhrase:
            body.requiredPhrase !== undefined
              ? body.requiredPhrase
              : existing.requiredPhrase,
          status: body.status ?? existing.status,
          updatedAt: new Date(),
        })
        .where(eq(guidelines.id, id))
        .returning();

      res.json({ guideline: updated });
    } catch (err) {
      console.error('Update guideline error:', err);
      res.status(500).json({ error: 'Failed to update guideline.' });
    }
  }
);

apiRouter.delete(
  '/guidelines/:id',
  requireAuth,
  requireRole('Admin', 'Manager'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [existing] = await db
        .select()
        .from(guidelines)
        .where(eq(guidelines.id, id))
        .limit(1);
      if (!existing) return res.status(404).json({ error: 'Guideline not found.' });
      if (!canAccessDepartment(req.authUser, existing.departmentId)) {
        return res
          .status(403)
          .json({ error: 'Forbidden: Cross-department access denied.' });
      }

      await db.delete(guidelines).where(eq(guidelines.id, id));
      res.json({ ok: true });
    } catch (err) {
      console.error('Delete guideline error:', err);
      res.status(500).json({ error: 'Failed to delete guideline.' });
    }
  }
);

apiRouter.get('/knowledge/:departmentId', requireAuth, async (req, res) => {
  try {
    const departmentId = Number(req.params.departmentId);
    if (!canAccessDepartment(req.authUser, departmentId)) {
      return res.status(403).json({
        error:
          'Forbidden: You cannot access knowledge items of another department.',
      });
    }
    const rows = await db
      .select()
      .from(knowledgeItems)
      .where(eq(knowledgeItems.departmentId, departmentId))
      .orderBy(knowledgeItems.factCode);
    res.json({ knowledgeItems: rows });
  } catch (err) {
    console.error('Get knowledge error:', err);
    res.status(500).json({ error: 'Failed to load department knowledge base.' });
  }
});

apiRouter.post(
  '/knowledge',
  requireAuth,
  requireRole('Admin', 'Manager', 'Reviewer'),
  async (req, res) => {
    try {
      const body = req.body;
      if (
        !body.departmentId ||
        !body.title ||
        !body.content ||
        !body.factType ||
        !body.owner ||
        !body.expiryDate
      ) {
        return res.status(400).json({
          error:
            'departmentId, title, content, factType, owner, and expiryDate are required.',
        });
      }
      if (!canAccessDepartment(req.authUser, body.departmentId)) {
        return res
          .status(403)
          .json({ error: 'Forbidden: Cross-department access denied.' });
      }
      const code =
        body.factCode?.trim() ||
        `FACT-${body.departmentId}-${String(Date.now()).slice(-4)}`;

      const [created] = await db
        .insert(knowledgeItems)
        .values({
          departmentId: body.departmentId,
          factCode: code,
          title: body.title.trim(),
          content: body.content.trim(),
          factType: body.factType,
          owner: body.owner.trim(),
          expiryDate: body.expiryDate,
          status: body.status || 'Approved',
        })
        .returning();

      res.status(201).json({ knowledgeItem: created });
    } catch (err) {
      console.error('Create knowledge error:', err);
      res.status(500).json({ error: 'Failed to add approved fact.' });
    }
  }
);

apiRouter.put(
  '/knowledge/:id',
  requireAuth,
  requireRole('Admin', 'Manager', 'Reviewer'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [existing] = await db
        .select()
        .from(knowledgeItems)
        .where(eq(knowledgeItems.id, id))
        .limit(1);
      if (!existing) {
        return res.status(404).json({ error: 'Knowledge item not found.' });
      }
      if (!canAccessDepartment(req.authUser, existing.departmentId)) {
        return res
          .status(403)
          .json({ error: 'Forbidden: Cross-department access denied.' });
      }

      const body = req.body;
      const [updated] = await db
        .update(knowledgeItems)
        .set({
          title: body.title ?? existing.title,
          content: body.content ?? existing.content,
          factType: body.factType ?? existing.factType,
          owner: body.owner ?? existing.owner,
          expiryDate: body.expiryDate ?? existing.expiryDate,
          status: body.status ?? existing.status,
          updatedAt: new Date(),
        })
        .where(eq(knowledgeItems.id, id))
        .returning();

      res.json({ knowledgeItem: updated });
    } catch (err) {
      console.error('Update knowledge error:', err);
      res.status(500).json({ error: 'Failed to update knowledge item.' });
    }
  }
);

apiRouter.delete(
  '/knowledge/:id',
  requireAuth,
  requireRole('Admin', 'Manager'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [existing] = await db
        .select()
        .from(knowledgeItems)
        .where(eq(knowledgeItems.id, id))
        .limit(1);
      if (!existing) {
        return res.status(404).json({ error: 'Knowledge item not found.' });
      }
      if (!canAccessDepartment(req.authUser, existing.departmentId)) {
        return res
          .status(403)
          .json({ error: 'Forbidden: Cross-department access denied.' });
      }

      await db.delete(knowledgeItems).where(eq(knowledgeItems.id, id));
      res.json({ ok: true });
    } catch (err) {
      console.error('Delete knowledge error:', err);
      res.status(500).json({ error: 'Failed to delete knowledge item.' });
    }
  }
);

apiRouter.post(
  '/knowledge/import',
  requireAuth,
  requireRole('Admin', 'Manager'),
  upload.single('file'),
  async (req, res) => {
    try {
      const departmentId = Number(req.body.departmentId);
      const owner = req.body.owner || req.authUser.name;
      const expiryDate = req.body.expiryDate || '2027-12-31';

      if (!departmentId || !req.file) {
        return res
          .status(400)
          .json({ error: 'departmentId and a TXT or DOCX file are required.' });
      }
      if (!canAccessDepartment(req.authUser, departmentId)) {
        return res
          .status(403)
          .json({ error: 'Forbidden: Cross-department access denied.' });
      }

      let rawText = '';
      if (
        req.file.originalname.toLowerCase().endsWith('.docx') ||
        req.file.mimetype.includes('wordprocessingml')
      ) {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        rawText = result.value;
      } else {
        rawText = req.file.buffer.toString('utf-8');
      }

      const lines = rawText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 10);

      if (lines.length === 0) {
        return res
          .status(400)
          .json({ error: 'No importable statements found in file.' });
      }

      const createdItems = await db
        .insert(knowledgeItems)
        .values(
          lines.slice(0, 20).map((line, i) => ({
            departmentId,
            factCode: `IMP-${departmentId}-${String(Date.now()).slice(-4)}-${i + 1}`,
            title: line.slice(0, 64) + (line.length > 64 ? '...' : ''),
            content: line,
            factType: 'policy',
            owner,
            expiryDate,
            status: 'Approved',
          }))
        )
        .returning();

      res
        .status(201)
        .json({ importedCount: createdItems.length, items: createdItems });
    } catch (err) {
      console.error('Import knowledge error:', err);
      res.status(500).json({ error: 'Failed to import knowledge document.' });
    }
  }
);

apiRouter.post(
  '/extract-docx',
  requireAuth,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please upload a .docx file.' });
      }
      const isDocx =
        req.file.originalname.toLowerCase().endsWith('.docx') ||
        req.file.mimetype.includes('wordprocessingml');
      if (!isDocx) {
        return res.status(400).json({
          error:
            'Only DOCX files are supported for extraction in this prototype.',
        });
      }
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      res.json({
        filename: req.file.originalname,
        text: result.value.trim(),
        warnings: result.messages,
      });
    } catch (err) {
      console.error('DOCX extraction error:', err);
      res
        .status(500)
        .json({ error: 'Failed to extract text from DOCX file.' });
    }
  }
);

apiRouter.get('/submissions', requireAuth, async (req, res) => {
  try {
    const user = req.authUser;
    const rows = await db
      .select({
        id: submissions.id,
        title: submissions.title,
        creatorId: submissions.creatorId,
        creatorName: users.name,
        departmentId: submissions.departmentId,
        departmentName: departments.name,
        contentType: submissions.contentType,
        channel: submissions.channel,
        status: submissions.status,
        currentVersion: submissions.currentVersion,
        aiModeUsed: submissions.aiModeUsed,
        createdAt: submissions.createdAt,
        updatedAt: submissions.updatedAt,
      })
      .from(submissions)
      .leftJoin(users, eq(submissions.creatorId, users.id))
      .leftJoin(departments, eq(submissions.departmentId, departments.id))
      .orderBy(desc(submissions.updatedAt));

    const visible =
      user.role === 'Admin' || user.role === 'Reviewer'
        ? rows
        : user.role === 'Creator'
        ? rows.filter(
            (r) =>
              r.departmentId === user.departmentId && r.creatorId === user.id
          )
        : rows.filter((r) => r.departmentId === user.departmentId);

    res.json({ submissions: visible });
  } catch (err) {
    console.error('List submissions error:', err);
    res.status(500).json({ error: 'Failed to fetch submissions.' });
  }
});

apiRouter.post('/submissions', requireAuth, async (req, res) => {
  try {
    const user = req.authUser;
    const { title, contentType, channel, departmentId, content, autoReview } =
      req.body;

    if (!title || !contentType || !channel || !content) {
      return res.status(400).json({
        error: 'Title, content type, channel, and content text are required.',
      });
    }

    const targetDeptId =
      user.role === 'Admin' && departmentId
        ? Number(departmentId)
        : user.departmentId || Number(departmentId);

    if (!targetDeptId) {
      return res.status(400).json({ error: 'A valid department is required.' });
    }
    if (!canAccessDepartment(user, targetDeptId)) {
      return res.status(403).json({
        error:
          'Forbidden: Creators can only submit content within their assigned department.',
      });
    }

    const [createdSub] = await db
      .insert(submissions)
      .values({
        title: title.trim(),
        creatorId: user.id,
        departmentId: targetDeptId,
        contentType,
        channel,
        status: 'Draft',
        currentVersion: 1,
        aiModeUsed: 'pending',
      })
      .returning();

    const [createdVer] = await db
      .insert(versions)
      .values({
        submissionId: createdSub.id,
        versionNumber: 1,
        content: content.trim(),
        createdBy: user.id,
        changeSummary: 'Initial submission.',
      })
      .returning();

    await db.insert(auditLogs).values({
      userId: user.id,
      submissionId: createdSub.id,
      action: 'SUBMISSION_CREATED',
      details: `Created "${createdSub.title}" (v1) in department #${targetDeptId}.`,
    });

    let reviewResult = null;
    if (autoReview !== false) {
      reviewResult = await runReviewForSubmission(createdSub.id, createdVer.id);
    }

    res.status(201).json({
      submission: createdSub,
      version: createdVer,
      review: reviewResult,
    });
  } catch (err) {
    console.error('Create submission error:', err);
    res.status(500).json({ error: 'Failed to create submission.' });
  }
});

apiRouter.get('/submissions/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [sub] = await db
      .select({
        id: submissions.id,
        title: submissions.title,
        creatorId: submissions.creatorId,
        creatorName: users.name,
        creatorEmail: users.email,
        departmentId: submissions.departmentId,
        departmentName: departments.name,
        departmentTone: departments.toneProfile,
        contentType: submissions.contentType,
        channel: submissions.channel,
        status: submissions.status,
        currentVersion: submissions.currentVersion,
        aiModeUsed: submissions.aiModeUsed,
        createdAt: submissions.createdAt,
        updatedAt: submissions.updatedAt,
      })
      .from(submissions)
      .leftJoin(users, eq(submissions.creatorId, users.id))
      .leftJoin(departments, eq(submissions.departmentId, departments.id))
      .where(eq(submissions.id, id))
      .limit(1);

    if (!sub) return res.status(404).json({ error: 'Submission not found.' });
    if (!canAccessDepartment(req.authUser, sub.departmentId)) {
      return res.status(403).json({
        error: 'Forbidden: You cannot view submissions from another department.',
      });
    }

    const versionRows = await db
      .select({
        id: versions.id,
        submissionId: versions.submissionId,
        versionNumber: versions.versionNumber,
        content: versions.content,
        createdBy: versions.createdBy,
        authorName: users.name,
        changeSummary: versions.changeSummary,
        createdAt: versions.createdAt,
      })
      .from(versions)
      .leftJoin(users, eq(versions.createdBy, users.id))
      .where(eq(versions.submissionId, sub.id))
      .orderBy(desc(versions.versionNumber));

    const latestVersion = versionRows[0];

    const findingRows = latestVersion
      ? await db
          .select()
          .from(findings)
          .where(eq(findings.versionId, latestVersion.id))
          .orderBy(findings.id)
      : [];

    const claimRows = latestVersion
      ? await db
          .select({
            id: claims.id,
            submissionId: claims.submissionId,
            versionId: claims.versionId,
            claimText: claims.claimText,
            category: claims.category,
            verdict: claims.verdict,
            sourceId: claims.sourceId,
            sourceCode: knowledgeItems.factCode,
            sourceTitle: knowledgeItems.title,
            sourceOwner: knowledgeItems.owner,
            sourceExpiryDate: knowledgeItems.expiryDate,
            sourceQuote: claims.sourceQuote,
            confidence: claims.confidence,
            explanation: claims.explanation,
            suggestion: claims.suggestion,
            reviewerStatus: claims.reviewerStatus,
            reviewerNote: claims.reviewerNote,
            verifiedBy: claims.verifiedBy,
            verifiedAt: claims.verifiedAt,
            createdAt: claims.createdAt,
          })
          .from(claims)
          .leftJoin(knowledgeItems, eq(claims.sourceId, knowledgeItems.id))
          .where(eq(claims.versionId, latestVersion.id))
          .orderBy(claims.id)
      : [];

    const commentRows = await db
      .select({
        id: comments.id,
        submissionId: comments.submissionId,
        versionId: comments.versionId,
        findingId: comments.findingId,
        parentId: comments.parentId,
        userId: comments.userId,
        authorName: users.name,
        authorRole: users.role,
        commentText: comments.commentText,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.submissionId, sub.id))
      .orderBy(comments.createdAt);

    const approvalRows = await db
      .select({
        id: approvals.id,
        submissionId: approvals.submissionId,
        versionId: approvals.versionId,
        reviewerId: approvals.reviewerId,
        reviewerName: users.name,
        reviewerRole: users.role,
        decision: approvals.decision,
        reason: approvals.reason,
        createdAt: approvals.createdAt,
      })
      .from(approvals)
      .leftJoin(users, eq(approvals.reviewerId, users.id))
      .where(eq(approvals.submissionId, sub.id))
      .orderBy(desc(approvals.createdAt));

    res.json({
      submission: sub,
      versions: versionRows,
      currentVersionData: latestVersion ?? null,
      findings: findingRows,
      claims: claimRows,
      comments: commentRows,
      approvals: approvalRows,
    });
  } catch (err) {
    console.error('Get submission detail error:', err);
    res.status(500).json({ error: 'Failed to load submission details.' });
  }
});

apiRouter.put('/submissions/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = req.authUser;
    const { content, changeSummary, title, submitForApproval, runReview } =
      req.body;

    const [sub] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id))
      .limit(1);
    if (!sub) return res.status(404).json({ error: 'Submission not found.' });
    if (!canAccessDepartment(user, sub.departmentId)) {
      return res
        .status(403)
        .json({ error: 'Forbidden: Cross-department access denied.' });
    }

    let nextVersionNumber = sub.currentVersion;
    let newVersionRow = null;

    if (content && content.trim().length > 0) {
      nextVersionNumber = sub.currentVersion + 1;
      const [insertedVer] = await db
        .insert(versions)
        .values({
          submissionId: sub.id,
          versionNumber: nextVersionNumber,
          content: content.trim(),
          createdBy: user.id,
          changeSummary: (changeSummary || 'Content revised.').trim(),
        })
        .returning();
      newVersionRow = insertedVer;
    }

    const nextStatus = submitForApproval
      ? sub.currentVersion >= 1 && sub.status === 'Changes Requested'
        ? 'Resubmitted'
        : 'Under Review'
      : sub.status;

    const [updatedSub] = await db
      .update(submissions)
      .set({
        ...(title ? { title: title.trim() } : {}),
        currentVersion: nextVersionNumber,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, sub.id))
      .returning();

    await db.insert(auditLogs).values({
      userId: user.id,
      submissionId: sub.id,
      action: newVersionRow ? 'VERSION_CREATED' : 'SUBMISSION_UPDATED',
      details: newVersionRow
        ? `Saved Version ${nextVersionNumber}: ${newVersionRow.changeSummary}`
        : `Updated submission status to ${nextStatus}.`,
    });

    let reviewResult = null;
    if (newVersionRow && runReview !== false) {
      reviewResult = await runReviewForSubmission(sub.id, newVersionRow.id);
    }

    res.json({
      submission: updatedSub,
      version: newVersionRow,
      review: reviewResult,
    });
  } catch (err) {
    console.error('Update submission error:', err);
    res.status(500).json({ error: 'Failed to save new version.' });
  }
});

apiRouter.post('/reviews/:submissionId/run', requireAuth, async (req, res) => {
  try {
    const submissionId = Number(req.params.submissionId);
    const [sub] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);
    if (!sub) return res.status(404).json({ error: 'Submission not found.' });
    if (!canAccessDepartment(req.authUser, sub.departmentId)) {
      return res
        .status(403)
        .json({ error: 'Forbidden: Cross-department access denied.' });
    }

    const result = await runReviewForSubmission(submissionId);
    await db.insert(auditLogs).values({
      userId: req.authUser.id,
      submissionId,
      action: 'REVIEW_EXECUTED',
      details: `Executed ${result.aiModeUsed} review (${result.findingsCount} findings, ${result.claimsCount} claims).`,
    });

    res.json(result);
  } catch (err) {
    console.error('Run review error:', err);
    res.status(500).json({ error: 'Failed to execute review engine.' });
  }
});

apiRouter.get(
  '/reviews/:submissionId/findings',
  requireAuth,
  async (req, res) => {
    try {
      const submissionId = Number(req.params.submissionId);
      const [sub] = await db
        .select()
        .from(submissions)
        .where(eq(submissions.id, submissionId))
        .limit(1);
      if (!sub) return res.status(404).json({ error: 'Submission not found.' });
      if (!canAccessDepartment(req.authUser, sub.departmentId)) {
        return res
          .status(403)
          .json({ error: 'Forbidden: Cross-department access denied.' });
      }

      const [latestVer] = await db
        .select()
        .from(versions)
        .where(
          and(
            eq(versions.submissionId, submissionId),
            eq(versions.versionNumber, sub.currentVersion)
          )
        )
        .limit(1);

      const rows = latestVer
        ? await db
            .select()
            .from(findings)
            .where(eq(findings.versionId, latestVer.id))
            .orderBy(findings.id)
        : [];

      res.json({ findings: rows });
    } catch (err) {
      console.error('Get findings error:', err);
      res.status(500).json({ error: 'Failed to fetch findings.' });
    }
  }
);

apiRouter.get(
  '/reviews/:submissionId/claims',
  requireAuth,
  async (req, res) => {
    try {
      const submissionId = Number(req.params.submissionId);
      const [sub] = await db
        .select()
        .from(submissions)
        .where(eq(submissions.id, submissionId))
        .limit(1);
      if (!sub) return res.status(404).json({ error: 'Submission not found.' });
      if (!canAccessDepartment(req.authUser, sub.departmentId)) {
        return res
          .status(403)
          .json({ error: 'Forbidden: Cross-department access denied.' });
      }

      const [latestVer] = await db
        .select()
        .from(versions)
        .where(
          and(
            eq(versions.submissionId, submissionId),
            eq(versions.versionNumber, sub.currentVersion)
          )
        )
        .limit(1);

      const rows = latestVer
        ? await db
            .select({
              id: claims.id,
              claimText: claims.claimText,
              category: claims.category,
              verdict: claims.verdict,
              sourceId: claims.sourceId,
              sourceCode: knowledgeItems.factCode,
              sourceOwner: knowledgeItems.owner,
              sourceExpiryDate: knowledgeItems.expiryDate,
              sourceQuote: claims.sourceQuote,
              confidence: claims.confidence,
              explanation: claims.explanation,
              suggestion: claims.suggestion,
              reviewerStatus: claims.reviewerStatus,
              reviewerNote: claims.reviewerNote,
            })
            .from(claims)
            .leftJoin(knowledgeItems, eq(claims.sourceId, knowledgeItems.id))
            .where(eq(claims.versionId, latestVer.id))
            .orderBy(claims.id)
        : [];

      res.json({ claims: rows });
    } catch (err) {
      console.error('Get claims error:', err);
      res.status(500).json({ error: 'Failed to fetch Claim Ledger.' });
    }
  }
);

apiRouter.post('/findings/:id/accept', requireAuth, async (req, res) => {
  try {
    const findingId = Number(req.params.id);
    const user = req.authUser;
    const { editedSuggestion } = req.body;

    const [finding] = await db
      .select()
      .from(findings)
      .where(eq(findings.id, findingId))
      .limit(1);
    if (!finding) return res.status(404).json({ error: 'Finding not found.' });

    const [sub] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, finding.submissionId))
      .limit(1);
    if (!sub || !canAccessDepartment(user, sub.departmentId)) {
      return res
        .status(403)
        .json({ error: 'Forbidden: Cross-department access denied.' });
    }

    const [currentVer] = await db
      .select()
      .from(versions)
      .where(
        and(
          eq(versions.submissionId, sub.id),
          eq(versions.versionNumber, sub.currentVersion)
        )
      )
      .limit(1);
    if (!currentVer) return res.status(404).json({ error: 'Version not found.' });

    const replacement = (editedSuggestion || finding.suggestion).trim();
    let updatedContent = currentVer.content;

    if (finding.highlightedText.startsWith('[Missing')) {
      updatedContent = `${currentVer.content.trim()} ${replacement}`.trim();
    } else if (currentVer.content.includes(finding.highlightedText)) {
      updatedContent = currentVer.content.replace(
        finding.highlightedText,
        replacement
      );
    } else {
      const idx = currentVer.content
        .toLowerCase()
        .indexOf(finding.highlightedText.toLowerCase());
      if (idx !== -1) {
        updatedContent =
          currentVer.content.slice(0, idx) +
          replacement +
          currentVer.content.slice(idx + finding.highlightedText.length);
      }
    }

    await db
      .update(findings)
      .set({ status: 'Addressed', addressedBy: user.id })
      .where(eq(findings.id, finding.id));

    const nextVersionNumber = sub.currentVersion + 1;
    const [newVer] = await db
      .insert(versions)
      .values({
        submissionId: sub.id,
        versionNumber: nextVersionNumber,
        content: updatedContent,
        createdBy: user.id,
        changeSummary: `Accepted suggestion for ${finding.ruleCode} ("${finding.highlightedText}" -> "${replacement}").`,
      })
      .returning();

    const remainingOpen = await db
      .select()
      .from(findings)
      .where(and(eq(findings.versionId, currentVer.id), eq(findings.status, 'Open')));

    if (remainingOpen.length > 0) {
      await db.insert(findings).values(
        remainingOpen.map((rf) => ({
          submissionId: sub.id,
          versionId: newVer.id,
          ruleId: rf.ruleId,
          ruleCode: rf.ruleCode,
          findingCode: rf.findingCode,
          category: rf.category,
          highlightedText: rf.highlightedText,
          explanation: rf.explanation,
          severity: rf.severity,
          confidence: rf.confidence,
          evidence: rf.evidence,
          suggestion: rf.suggestion,
          unchangedNote: rf.unchangedNote,
          status: 'Open',
        }))
      );
    }

    const currentClaims = await db
      .select()
      .from(claims)
      .where(eq(claims.versionId, currentVer.id));

    if (currentClaims.length > 0) {
      await db.insert(claims).values(
        currentClaims.map((c) => ({
          submissionId: sub.id,
          versionId: newVer.id,
          claimText: c.claimText,
          category: c.category,
          verdict: c.verdict,
          sourceId: c.sourceId,
          sourceQuote: c.sourceQuote,
          confidence: c.confidence,
          explanation: c.explanation,
          suggestion: c.suggestion,
          reviewerStatus: c.reviewerStatus,
          reviewerNote: c.reviewerNote,
          verifiedBy: c.verifiedBy,
          verifiedAt: c.verifiedAt,
        }))
      );
    }

    await db
      .update(submissions)
      .set({
        currentVersion: nextVersionNumber,
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, sub.id));

    await db.insert(auditLogs).values({
      userId: user.id,
      submissionId: sub.id,
      action: 'SUGGESTION_ACCEPTED',
      details: `Accepted suggestion on ${finding.ruleCode}; created Version ${nextVersionNumber}.`,
    });

    res.json({ ok: true, newVersion: newVer });
  } catch (err) {
    console.error('Accept suggestion error:', err);
    res.status(500).json({ error: 'Failed to apply suggestion.' });
  }
});

apiRouter.post('/findings/:id/dismiss', requireAuth, async (req, res) => {
  try {
    const findingId = Number(req.params.id);
    const user = req.authUser;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 4) {
      return res.status(400).json({
        error: 'A written reason is required to dismiss or override a finding.',
      });
    }

    const [finding] = await db
      .select()
      .from(findings)
      .where(eq(findings.id, findingId))
      .limit(1);
    if (!finding) return res.status(404).json({ error: 'Finding not found.' });

    const [sub] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, finding.submissionId))
      .limit(1);
    if (!sub || !canAccessDepartment(user, sub.departmentId)) {
      return res
        .status(403)
        .json({ error: 'Forbidden: Cross-department access denied.' });
    }

    const newStatus = user.role === 'Manager' ? 'Overridden' : 'Dismissed';
    const [updated] = await db
      .update(findings)
      .set({
        status: newStatus,
        dismissReason: reason.trim(),
        addressedBy: user.id,
      })
      .where(eq(findings.id, findingId))
      .returning();

    await db.insert(auditLogs).values({
      userId: user.id,
      submissionId: sub.id,
      action: 'FINDING_DISMISSED',
      details: `${newStatus} finding ${finding.ruleCode} with reason: "${reason.trim()}"`,
    });

    res.json({ finding: updated });
  } catch (err) {
    console.error('Dismiss finding error:', err);
    res.status(500).json({ error: 'Failed to dismiss finding.' });
  }
});

apiRouter.get('/submissions/:id/comments', requireAuth, async (req, res) => {
  try {
    const submissionId = Number(req.params.id);
    const [sub] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);
    if (!sub) return res.status(404).json({ error: 'Submission not found.' });
    if (!canAccessDepartment(req.authUser, sub.departmentId)) {
      return res
        .status(403)
        .json({ error: 'Forbidden: Cross-department access denied.' });
    }

    const rows = await db
      .select({
        id: comments.id,
        submissionId: comments.submissionId,
        versionId: comments.versionId,
        findingId: comments.findingId,
        parentId: comments.parentId,
        userId: comments.userId,
        authorName: users.name,
        authorRole: users.role,
        commentText: comments.commentText,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.submissionId, submissionId))
      .orderBy(comments.createdAt);

    res.json({ comments: rows });
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Failed to load comments.' });
  }
});

apiRouter.post('/submissions/:id/comments', requireAuth, async (req, res) => {
  try {
    const submissionId = Number(req.params.id);
    const user = req.authUser;
    const { commentText, findingId, parentId } = req.body;

    if (!commentText || !commentText.trim()) {
      return res.status(400).json({ error: 'Comment text cannot be empty.' });
    }

    const [sub] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);
    if (!sub) return res.status(404).json({ error: 'Submission not found.' });
    if (!canAccessDepartment(user, sub.departmentId)) {
      return res
        .status(403)
        .json({ error: 'Forbidden: Cross-department access denied.' });
    }

    const [latestVer] = await db
      .select()
      .from(versions)
      .where(
        and(
          eq(versions.submissionId, submissionId),
          eq(versions.versionNumber, sub.currentVersion)
        )
      )
      .limit(1);

    if (!latestVer) return res.status(404).json({ error: 'Version not found.' });

    const [created] = await db
      .insert(comments)
      .values({
        submissionId,
        versionId: latestVer.id,
        findingId: findingId || null,
        parentId: parentId || null,
        userId: user.id,
        commentText: commentText.trim(),
      })
      .returning();

    res.status(201).json({
      comment: {
        ...created,
        authorName: user.name,
        authorRole: user.role,
      },
    });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Failed to post comment.' });
  }
});

apiRouter.post(
  '/claims/:id/verify',
  requireAuth,
  requireRole('Reviewer', 'Admin'),
  async (req, res) => {
    try {
      const claimId = Number(req.params.id);
      const user = req.authUser;
      const { reviewerStatus, verdict, sourceId, note } = req.body;

      const [claim] = await db
        .select()
        .from(claims)
        .where(eq(claims.id, claimId))
        .limit(1);
      if (!claim) return res.status(404).json({ error: 'Claim not found.' });

      let nextSourceQuote = claim.sourceQuote;
      let nextSourceId = claim.sourceId;
      if (sourceId) {
        const [fact] = await db
          .select()
          .from(knowledgeItems)
          .where(eq(knowledgeItems.id, sourceId))
          .limit(1);
        if (!fact) {
          return res
            .status(400)
            .json({ error: 'Selected knowledge source does not exist.' });
        }
        nextSourceId = fact.id;
        nextSourceQuote = fact.content;
      }

      const [updated] = await db
        .update(claims)
        .set({
          reviewerStatus: reviewerStatus || 'Verified',
          verdict: verdict || claim.verdict,
          sourceId: nextSourceId,
          sourceQuote: nextSourceQuote,
          reviewerNote: note?.trim() || claim.reviewerNote,
          verifiedBy: user.id,
          verifiedAt: new Date(),
        })
        .where(eq(claims.id, claimId))
        .returning();

      await db.insert(auditLogs).values({
        userId: user.id,
        submissionId: claim.submissionId,
        action: 'CLAIM_VERIFIED',
        details: `Reviewer set claim #${claim.id} to ${updated.reviewerStatus} (${updated.verdict}).`,
      });

      res.json({ claim: updated });
    } catch (err) {
      console.error('Verify claim error:', err);
      res.status(500).json({ error: 'Failed to update claim verification.' });
    }
  }
);

apiRouter.post(
  '/submissions/:id/approve',
  requireAuth,
  requireRole('Manager', 'Admin'),
  async (req, res) => {
    try {
      const submissionId = Number(req.params.id);
      const user = req.authUser;
      const { reason, overrideReason } = req.body;

      const [sub] = await db
        .select()
        .from(submissions)
        .where(eq(submissions.id, submissionId))
        .limit(1);
      if (!sub) return res.status(404).json({ error: 'Submission not found.' });
      if (!canAccessDepartment(user, sub.departmentId)) {
        return res.status(403).json({
          error:
            'Forbidden: Managers can only approve submissions in their own department.',
        });
      }

      const [latestVer] = await db
        .select()
        .from(versions)
        .where(
          and(
            eq(versions.submissionId, submissionId),
            eq(versions.versionNumber, sub.currentVersion)
          )
        )
        .limit(1);
      if (!latestVer) return res.status(404).json({ error: 'Version not found.' });

      const openBlockers = await db
        .select()
        .from(findings)
        .where(
          and(
            eq(findings.versionId, latestVer.id),
            eq(findings.status, 'Open'),
            eq(findings.severity, 'Blocker')
          )
        );

      const unresolvedClaims = await db
        .select()
        .from(claims)
        .where(eq(claims.versionId, latestVer.id));

      const highRiskUnresolved = unresolvedClaims.filter(
        (c) =>
          (c.verdict === 'CONFLICTS' || c.verdict === 'UNVERIFIED') &&
          c.reviewerStatus !== 'Verified'
      );

      if (
        (openBlockers.length > 0 || highRiskUnresolved.length > 0) &&
        (!overrideReason || overrideReason.trim().length < 8)
      ) {
        return res.status(409).json({
          error: `Cannot approve: ${openBlockers.length} open Blocker finding(s) and ${highRiskUnresolved.length} unverified/conflicting claim(s) remain. Resolve them or provide a written Manager Override Reason (min 8 chars).`,
          requiresOverride: true,
          openBlockersCount: openBlockers.length,
          unresolvedClaimsCount: highRiskUnresolved.length,
        });
      }

      const decisionText = overrideReason
        ? `Approved (Override: ${overrideReason.trim()})`
        : reason?.trim() || 'Approved for publication.';

      const [approval] = await db
        .insert(approvals)
        .values({
          submissionId,
          versionId: latestVer.id,
          reviewerId: user.id,
          decision: overrideReason ? 'Override Approved' : 'Approved',
          reason: decisionText,
        })
        .returning();

      const [updatedSub] = await db
        .update(submissions)
        .set({ status: 'Approved', updatedAt: new Date() })
        .where(eq(submissions.id, submissionId))
        .returning();

      await db.insert(auditLogs).values({
        userId: user.id,
        submissionId,
        action: overrideReason
          ? 'SUBMISSION_OVERRIDE_APPROVED'
          : 'SUBMISSION_APPROVED',
        details: decisionText,
      });

      res.json({ submission: updatedSub, approval });
    } catch (err) {
      console.error('Approve submission error:', err);
      res.status(500).json({ error: 'Failed to approve submission.' });
    }
  }
);

apiRouter.post(
  '/submissions/:id/request-changes',
  requireAuth,
  requireRole('Manager', 'Reviewer', 'Admin'),
  async (req, res) => {
    try {
      const submissionId = Number(req.params.id);
      const user = req.authUser;
      const { reason } = req.body;

      if (!reason || reason.trim().length < 4) {
        return res.status(400).json({
          error: 'Please provide feedback explaining the requested changes.',
        });
      }

      const [sub] = await db
        .select()
        .from(submissions)
        .where(eq(submissions.id, submissionId))
        .limit(1);
      if (!sub) return res.status(404).json({ error: 'Submission not found.' });
      if (!canAccessDepartment(user, sub.departmentId)) {
        return res
          .status(403)
          .json({ error: 'Forbidden: Cross-department access denied.' });
      }

      const [latestVer] = await db
        .select()
        .from(versions)
        .where(
          and(
            eq(versions.submissionId, submissionId),
            eq(versions.versionNumber, sub.currentVersion)
          )
        )
        .limit(1);

      const [approval] = await db
        .insert(approvals)
        .values({
          submissionId,
          versionId: latestVer.id,
          reviewerId: user.id,
          decision: 'Changes Requested',
          reason: reason.trim(),
        })
        .returning();

      const [updatedSub] = await db
        .update(submissions)
        .set({ status: 'Changes Requested', updatedAt: new Date() })
        .where(eq(submissions.id, submissionId))
        .returning();

      await db.insert(auditLogs).values({
        userId: user.id,
        submissionId,
        action: 'CHANGES_REQUESTED',
        details: reason.trim(),
      });

      res.json({ submission: updatedSub, approval });
    } catch (err) {
      console.error('Request changes error:', err);
      res.status(500).json({ error: 'Failed to request changes.' });
    }
  }
);

apiRouter.post(
  '/submissions/:id/reject',
  requireAuth,
  requireRole('Manager', 'Admin'),
  async (req, res) => {
    try {
      const submissionId = Number(req.params.id);
      const user = req.authUser;
      const { reason } = req.body;

      if (!Number.isInteger(submissionId) || submissionId <= 0) {
        return res.status(400).json({ error: 'Invalid submission ID.' });
      }

      if (!reason || reason.trim().length < 4) {
        return res.status(400).json({
          error: 'A rejection reason is required (minimum 4 characters).',
        });
      }

      const txResult = await db.transaction(async (tx) => {
        const [sub] = await tx
          .select()
          .from(submissions)
          .where(eq(submissions.id, submissionId))
          .limit(1);

        if (!sub) {
          return { status: 404, error: 'Submission not found.' };
        }
        if (!canAccessDepartment(user, sub.departmentId)) {
          return {
            status: 403,
            error: 'Forbidden: Cross-department access denied.',
          };
        }

        // Preserve audit history while removing FK references to the deleted post
        await tx
          .update(auditLogs)
          .set({ submissionId: null })
          .where(eq(auditLogs.submissionId, submissionId));

        // Explicitly delete all dependent records (approvals, comments, claims, findings, versions)
        await tx.delete(approvals).where(eq(approvals.submissionId, submissionId));
        await tx.delete(comments).where(eq(comments.submissionId, submissionId));
        await tx.delete(claims).where(eq(claims.submissionId, submissionId));
        await tx.delete(findings).where(eq(findings.submissionId, submissionId));
        await tx.delete(versions).where(eq(versions.submissionId, submissionId));

        // Permanently delete the post itself
        const [deletedSub] = await tx
          .delete(submissions)
          .where(eq(submissions.id, submissionId))
          .returning();

        if (!deletedSub) {
          throw new Error('Failed to delete submission record.');
        }

        await tx.insert(auditLogs).values({
          userId: user.id,
          submissionId: null,
          action: 'SUBMISSION_REJECTED_DELETED',
          details: `Rejected and permanently deleted "${sub.title}" (#${submissionId}): ${reason.trim()}`,
        });

        return {
          status: 200,
          deletedId: deletedSub.id,
          deletedTitle: deletedSub.title,
        };
      });

      if (txResult.status !== 200) {
        return res.status(txResult.status).json({ error: txResult.error });
      }

      res.json({
        ok: true,
        deleted: true,
        deletedSubmissionId: txResult.deletedId,
        deletedTitle: txResult.deletedTitle,
      });
    } catch (err) {
      console.error('Reject and delete submission error:', err);
      res.status(500).json({
        error: 'Failed to reject and permanently delete submission.',
      });
    }
  }
);

apiRouter.get('/submissions/:id/versions', requireAuth, async (req, res) => {
  try {
    const submissionId = Number(req.params.id);
    const [sub] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);
    if (!sub) return res.status(404).json({ error: 'Submission not found.' });
    if (!canAccessDepartment(req.authUser, sub.departmentId)) {
      return res
        .status(403)
        .json({ error: 'Forbidden: Cross-department access denied.' });
    }

    const versionRows = await db
      .select({
        id: versions.id,
        submissionId: versions.submissionId,
        versionNumber: versions.versionNumber,
        content: versions.content,
        createdBy: versions.createdBy,
        authorName: users.name,
        changeSummary: versions.changeSummary,
        createdAt: versions.createdAt,
      })
      .from(versions)
      .leftJoin(users, eq(versions.createdBy, users.id))
      .where(eq(versions.submissionId, submissionId))
      .orderBy(desc(versions.versionNumber));

    const allFindings = await db
      .select()
      .from(findings)
      .where(eq(findings.submissionId, submissionId));

    const allClaims = await db
      .select()
      .from(claims)
      .where(eq(claims.submissionId, submissionId));

    const allApprovals = await db
      .select({
        id: approvals.id,
        versionId: approvals.versionId,
        decision: approvals.decision,
        reason: approvals.reason,
        reviewerName: users.name,
        createdAt: approvals.createdAt,
      })
      .from(approvals)
      .leftJoin(users, eq(approvals.reviewerId, users.id))
      .where(eq(approvals.submissionId, submissionId));

    const enriched = versionRows.map((v) => ({
      ...v,
      findingsCount: allFindings.filter((f) => f.versionId === v.id).length,
      claimsCount: allClaims.filter((c) => c.versionId === v.id).length,
      approvals: allApprovals.filter((a) => a.versionId === v.id),
    }));

    res.json({ submission: sub, versions: enriched });
  } catch (err) {
    console.error('Get versions error:', err);
    res.status(500).json({ error: 'Failed to load version history.' });
  }
});

apiRouter.get('/versions/:id', requireAuth, async (req, res) => {
  try {
    const versionId = Number(req.params.id);
    const [ver] = await db
      .select()
      .from(versions)
      .where(eq(versions.id, versionId))
      .limit(1);
    if (!ver) return res.status(404).json({ error: 'Version not found.' });

    const [sub] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, ver.submissionId))
      .limit(1);
    if (!sub || !canAccessDepartment(req.authUser, sub.departmentId)) {
      return res
        .status(403)
        .json({ error: 'Forbidden: Cross-department access denied.' });
    }

    const verFindings = await db
      .select()
      .from(findings)
      .where(eq(findings.versionId, ver.id));
    const verClaims = await db
      .select()
      .from(claims)
      .where(eq(claims.versionId, ver.id));

    res.json({ version: ver, findings: verFindings, claims: verClaims });
  } catch (err) {
    console.error('Get version error:', err);
    res.status(500).json({ error: 'Failed to load version.' });
  }
});
