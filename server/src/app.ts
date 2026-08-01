import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { config } from './config.js';
import { healthRoutes } from './routes/health.js';
import { sessionRoutes } from './routes/session.js';
import { chatRoutes } from './routes/chat.js';
import type { AuthVariables } from './middleware/auth.js';

export function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();

  app.use(
    '*',
    cors({
      origin: (origin) => {
        // Allow non-browser clients (no Origin header).
        if (!origin) return config.corsOrigins[0] ?? '*';
        return config.corsOrigins.includes(origin) ? origin : null;
      },
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['X-RateLimit-Remaining', 'Retry-After'],
      maxAge: 600,
    }),
  );

  app.use(
    '*',
    bodyLimit({
      maxSize: config.maxBodyBytes,
      onError: (c) =>
        c.json(
          { error: 'Request body too large', code: 'BODY_TOO_LARGE' },
          413,
        ),
    }),
  );

  app.route('/', healthRoutes);
  app.route('/', sessionRoutes);
  app.route('/', chatRoutes);

  app.notFound((c) =>
    c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404),
  );

  app.onError((err, c) => {
    console.error('[app] unhandled error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return c.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      500,
    );
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
