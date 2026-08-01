import { Hono } from 'hono';
import { createSession } from '../services/session.js';
import { sessionMintRateLimiter } from '../services/rateLimit.js';

export const sessionRoutes = new Hono();

function clientIp(c: { req: { header: (n: string) => string | undefined } }): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return c.req.header('x-real-ip')?.trim() || 'unknown';
}

sessionRoutes.post('/v1/session', async (c) => {
  const ip = clientIp(c);
  const limit = sessionMintRateLimiter.consume(`mint:${ip}`);
  if (!limit.allowed) {
    c.header('Retry-After', String(limit.retryAfterSeconds));
    return c.json(
      { error: 'rate_limit', code: 'SESSION_MINT_RATE_LIMIT' },
      429,
    );
  }

  try {
    const session = await createSession();
    return c.json(
      {
        sessionToken: session.sessionToken,
        expiresAt: session.expiresAt,
      },
      201,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Session create failed';
    console.error('[session] create failed', { error: message });
    return c.json(
      {
        error: 'Failed to create session',
        code: 'SESSION_CREATE_FAILED',
      },
      500,
    );
  }
});
