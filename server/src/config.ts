import { randomBytes } from 'node:crypto';

const VERSION = '1.0.0';

function parseOrigins(raw: string | undefined): string[] {
  const fallback = 'http://localhost:3000,http://127.0.0.1:3000';
  return (raw ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveSessionSecret(): { secret: string; ephemeral: boolean } {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 16) {
    return { secret: fromEnv, ephemeral: false };
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET must be set to a string of at least 16 characters in production',
    );
  }
  // Dev fallback: random secret so the server boots without config.
  // Sessions will not survive restarts.
  const secret = randomBytes(32).toString('hex');
  console.warn(
    '[config] SESSION_SECRET unset or too short — using ephemeral in-memory secret (dev only)',
  );
  return { secret, ephemeral: true };
}

const session = resolveSessionSecret();

export const config = {
  version: VERSION,
  port: Number(process.env.PORT ?? 8787) || 8787,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() ?? '',
  sessionSecret: session.secret,
  sessionSecretEphemeral: session.ephemeral,
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  /** Soft global daily token budget (input + output). 0 = disabled. */
  dailyTokenBudget: Number(process.env.DAILY_TOKEN_BUDGET ?? 0) || 0,
  /** Session JWT lifetime in seconds (24h). */
  sessionTtlSeconds: 60 * 60 * 24,
  /** Rate limit: max requests per session per window. */
  rateLimitMax: 30,
  /** Rate limit window in milliseconds (10 minutes). */
  rateLimitWindowMs: 10 * 60 * 1000,
  /** Max JSON body size in bytes (~1 MiB). */
  maxBodyBytes: 1_048_576,
  /** Anthropic model id. */
  model: 'claude-sonnet-5' as const,
  /** Max tokens for chat completions. */
  maxTokens: 8192,
} as const;

export type AppConfig = typeof config;
