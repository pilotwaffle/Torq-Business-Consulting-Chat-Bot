import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { config } from './config.js';

function maskKey(key: string): string {
  if (!key) return '(not set)';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function main() {
  const app = createApp();

  console.log('[torq-chat-bff] starting', {
    version: config.version,
    port: config.port,
    corsOrigins: config.corsOrigins,
    anthropicKey: maskKey(config.anthropicApiKey),
    sessionSecretEphemeral: config.sessionSecretEphemeral,
    dailyTokenBudget: config.dailyTokenBudget || '(disabled)',
    model: config.model,
  });

  if (!config.anthropicApiKey) {
    console.warn(
      '[torq-chat-bff] ANTHROPIC_API_KEY is not set — /v1/chat/stream will return 503',
    );
  }

  serve(
    {
      fetch: app.fetch,
      port: config.port,
      hostname: '0.0.0.0',
    },
    (info) => {
      console.log(
        `[torq-chat-bff] listening on http://localhost:${info.port}`,
      );
    },
  );
}

main();
