import type { Context, Next } from 'hono';
import { sessionRateLimiter } from '../services/rateLimit.js';
import type { SessionClaims } from '../types.js';

/**
 * Enforce per-session rate limit (must run after requireSession).
 */
export async function rateLimitSession(c: Context, next: Next) {
  const session = c.get('session') as SessionClaims | undefined;
  if (!session?.sub) {
    return c.json(
      { error: 'Session required for rate limiting', code: 'UNAUTHORIZED' },
      401,
    );
  }

  const result = sessionRateLimiter.consume(session.sub);

  c.header('X-RateLimit-Remaining', String(result.remaining));

  if (!result.allowed) {
    c.header('Retry-After', String(result.retryAfterSeconds));
    return c.json({ error: 'rate_limit' }, 429);
  }

  await next();
}
