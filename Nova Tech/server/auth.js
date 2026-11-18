import crypto from 'crypto';

const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret() {
  return process.env.SESSION_SECRET || EPHEMERAL_FALLBACK_SECRET;
}

export const SESSION_COOKIE_NAME = 'novatech_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SSO_TICKET_TTL_MS = 90 * 1000;

const ssoTicketStore = new Map();

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (!password || !storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  const expectedBuf = Buffer.from(keyHex, 'hex');
  const actualBuf = crypto.scryptSync(password, salt, 64);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function signPayload(encodedPayload) {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest('base64url');
}

export function createSessionToken(user) {
  const now = Date.now();
  const payload = {
    uid: user.id,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = signPayload(encoded);
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;

  const expectedSig = signPayload(encoded);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!parsed || !parsed.uid || !parsed.exp || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return cookies;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        cookies[key] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }
  }
  return cookies;
}

export function getCookieOptions(req) {
  const forwardedProto = req?.headers?.['x-forwarded-proto'];
  const isHttps =
    Boolean(req?.secure) ||
    (typeof forwardedProto === 'string' && forwardedProto.split(',')[0].trim() === 'https');
  return {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

export function issueSsoTicket(user, targetRoute = '/submissions/new') {
  const now = Date.now();
  for (const [key, value] of ssoTicketStore.entries()) {
    if (value.expiresAt <= now) {
      ssoTicketStore.delete(key);
    }
  }

  const code = `sso_${crypto.randomBytes(24).toString('base64url')}`;
  const expiresAt = now + SSO_TICKET_TTL_MS;
  ssoTicketStore.set(code, {
    userId: user.id,
    email: user.email,
    name: user.name,
    websiteRole: user.websiteRole,
    department: user.department,
    brandosRole: user.brandosRole,
    targetRoute,
    issuedAt: now,
    expiresAt,
  });

  return {
    code,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

export function consumeSsoTicket(code) {
  if (!code || typeof code !== 'string') return null;
  const entry = ssoTicketStore.get(code);
  if (!entry) return null;
  ssoTicketStore.delete(code);
  if (Date.now() > entry.expiresAt) return null;
  return entry;
}

export function verifyBrandosSharedSecret(headerSecret) {
  const configured = process.env.BRANDOS_SSO_SHARED_SECRET;
  if (!configured || !headerSecret || typeof headerSecret !== 'string') return false;
  const a = Buffer.from(configured);
  const b = Buffer.from(headerSecret);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
