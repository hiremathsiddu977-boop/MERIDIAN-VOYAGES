import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';

export const OWNER_EMAIL = 'hiremathsiddu@gmail.com';
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  `meridian-${process.env.SQL_DB_NAME || 'local'}-portal-key`;

export interface SessionPayload {
  uid: string;
  email: string;
  name: string;
  role: 'customer' | 'owner';
  exp: number;
}

export interface AuthRequest extends Request {
  sessionUser?: SessionPayload;
}

export function signSessionToken(payload: Omit<SessionPayload, 'exp'>): string {
  const full: SessionPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  const data = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf8')
    ) as SessionPayload;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  const token = authHeader.slice('Bearer '.length).trim();

  // Verify signed portal session token first (supports email customer & owner login)
  const session = verifySessionToken(token);
  if (session) {
    req.sessionUser = session;
    return next();
  }

  // Fallback: verify Firebase ID token (for Google Sign-In sessions)
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = (decoded.email || '').toLowerCase();
    req.sessionUser = {
      uid: decoded.uid,
      email,
      name: decoded.name || email.split('@')[0] || 'Traveler',
      role: email === OWNER_EMAIL ? 'owner' : 'customer',
      exp: Date.now() + 1000 * 60 * 60,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireOwner = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAuth(req, res, () => {
    if (
      !req.sessionUser ||
      req.sessionUser.role !== 'owner' ||
      req.sessionUser.email.toLowerCase() !== OWNER_EMAIL
    ) {
      return res.status(403).json({ error: 'Forbidden: Owner access required' });
    }
    next();
  });
};
