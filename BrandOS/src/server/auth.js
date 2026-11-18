import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, departments } from '../db/schema.js';
import { adminAuth } from '../lib/firebase-admin.js';

const RUNTIME_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret() {
  return process.env.SESSION_SECRET || RUNTIME_FALLBACK_SECRET;
}

export const SESSION_COOKIE_NAME = 'brandos_session';

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signSessionToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role,
    },
    getSessionSecret(),
    { expiresIn: '24h' }
  );
}

export function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  const result = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const key = decodeURIComponent(part.slice(0, idx).trim());
      const val = decodeURIComponent(part.slice(idx + 1).trim());
      result[key] = val;
    }
  }
  return result;
}

export function setSessionCookie(res, token) {
  const isProd =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.APP_URL?.startsWith('https://'));
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  const isProd =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.APP_URL?.startsWith('https://'));
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    path: '/',
  });
}

async function loadUserByEmailOrId(params) {
  let row;
  if (params.id) {
    const rows = await db
      .select({
        id: users.id,
        uid: users.uid,
        name: users.name,
        email: users.email,
        role: users.role,
        departmentId: users.departmentId,
        title: users.title,
        departmentName: departments.name,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(users.id, params.id))
      .limit(1);
    row = rows[0];
  } else if (params.uid) {
    const rows = await db
      .select({
        id: users.id,
        uid: users.uid,
        name: users.name,
        email: users.email,
        role: users.role,
        departmentId: users.departmentId,
        title: users.title,
        departmentName: departments.name,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(users.uid, params.uid))
      .limit(1);
    row = rows[0];
  }

  if (!row && params.email) {
    const rows = await db
      .select({
        id: users.id,
        uid: users.uid,
        name: users.name,
        email: users.email,
        role: users.role,
        departmentId: users.departmentId,
        title: users.title,
        departmentName: departments.name,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(users.email, params.email))
      .limit(1);
    row = rows[0];
  }

  if (!row && params.uid && params.email) {
    const allDepts = await db.select().from(departments).limit(1);
    const defaultDeptId = allDepts[0]?.id ?? null;
    const inserted = await db
      .insert(users)
      .values({
        uid: params.uid,
        email: params.email,
        name: params.name || params.email.split('@')[0],
        role: 'Creator',
        departmentId: defaultDeptId,
        title: 'Workspace Member',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email: params.email },
      })
      .returning();
    if (inserted[0]) {
      return {
        id: inserted[0].id,
        uid: inserted[0].uid,
        name: inserted[0].name,
        email: inserted[0].email,
        role: inserted[0].role || 'Creator',
        departmentId: inserted[0].departmentId,
        departmentName: allDepts[0]?.name ?? null,
        title: inserted[0].title,
      };
    }
  }

  if (!row) return null;

  return {
    id: row.id,
    uid: row.uid,
    name: row.name,
    email: row.email,
    role: row.role,
    departmentId: row.departmentId,
    departmentName: row.departmentName ?? null,
    title: row.title,
  };
}

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const cookies = parseCookies(req);
    let bearerToken;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      bearerToken = authHeader.slice('Bearer '.length).trim();
    }

    const token = bearerToken || cookies[SESSION_COOKIE_NAME];
    if (!token) {
      return res
        .status(401)
        .json({ error: 'Authentication required. Please log in.' });
    }

    try {
      const payload = jwt.verify(token, getSessionSecret());
      const userId = Number(payload.sub);
      if (Number.isFinite(userId)) {
        const user = await loadUserByEmailOrId({ id: userId });
        if (user) {
          req.authUser = user;
          return next();
        }
      }
    } catch {
      // Proceed to Firebase ID token verification
    }

    try {
      const decoded = await adminAuth.verifyIdToken(token);
      const user = await loadUserByEmailOrId({
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name,
      });
      if (user) {
        req.authUser = user;
        return next();
      }
    } catch {
      // Invalid Firebase token
    }

    return res.status(401).json({ error: 'Session expired or invalid token.' });
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication check failed.' });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.authUser.role)) {
      return res.status(403).json({
        error: `Forbidden: ${req.authUser.role} role does not have permission for this action.`,
      });
    }
    return next();
  };
}

export function canAccessDepartment(user, departmentId) {
  if (user.role === 'Admin' || user.role === 'Reviewer') {
    return true;
  }
  return user.departmentId === departmentId;
}
