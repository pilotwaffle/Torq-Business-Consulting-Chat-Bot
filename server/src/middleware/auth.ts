import type { Context, Next } from 'hono';
import { verifySessionToken } from '../services/session.js';
import type { SessionClaims } from '../types.js';

export type AuthVariables = {
  session: SessionClaims;
};

/**
 * Require `Authorization: Bearer <sessionToken>`.
 * On success, sets `c.get('session')` with verified claims.
 */
export async function requireSession(c: Context, next: Next) {
  const header = c.req.header('authorization') ?? c.req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return c.json(
      {
        error: 'Missing or invalid Authorization header',
        code: 'UNAUTHORIZED',
      },
      401,
    );
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return c.json(
      {
        error: 'Missing session token',
        code: 'UNAUTHORIZED',
      },
      401,
    );
  }

  try {
    const session = await verifySessionToken(token);
    c.set('session', session);
    await next();
  } catch {
    return c.json(
      {
        error: 'Invalid or expired session token',
        code: 'UNAUTHORIZED',
      },
      401,
    );
  }
}
