import './setup.js';
import { describe, it, expect, beforeAll } from 'vitest';
import type { App } from '../src/app.js';

let app: App;
let sessionToken: string;

beforeAll(async () => {
  const mod = await import('../src/app.js');
  app = mod.createApp();
  const res = await app.request('/v1/session', { method: 'POST' });
  const body = await res.json();
  sessionToken = body.sessionToken;
});

function chat(body: unknown) {
  return app.request('/v1/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /v1/chat/stream validation', () => {
  it('rejects empty messages array', async () => {
    const res = await chat({
      consultantId: 'strategic-advisor',
      messages: [],
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('rejects messages with only empty content', async () => {
    const res = await chat({
      consultantId: 'strategic-advisor',
      messages: [{ role: 'user', content: '   ' }],
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('EMPTY_MESSAGES');
  });

  it('rejects unknown consultantId', async () => {
    const res = await chat({
      consultantId: 'not-a-real-consultant',
      messages: [{ role: 'user', content: 'Hi' }],
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('UNKNOWN_CONSULTANT');
  });

  it('rejects invalid JSON', async () => {
    const res = await app.request('/v1/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: '{not-json',
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_JSON');
  });
});
