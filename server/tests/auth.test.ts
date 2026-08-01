import './setup.js';
import { describe, it, expect, beforeAll } from 'vitest';
import type { App } from '../src/app.js';

let app: App;

beforeAll(async () => {
  const mod = await import('../src/app.js');
  app = mod.createApp();
});

const chatBody = {
  consultantId: 'strategic-advisor',
  messages: [{ role: 'user', content: 'Hello' }],
};

describe('POST /v1/chat/stream auth', () => {
  it('rejects requests without Authorization header', async () => {
    const res = await app.request('/v1/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatBody),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('rejects requests with malformed Authorization header', async () => {
    const res = await app.request('/v1/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'NotBearer abc',
      },
      body: JSON.stringify(chatBody),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('rejects requests with invalid Bearer token', async () => {
    const res = await app.request('/v1/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer not-a-valid-jwt',
      },
      body: JSON.stringify(chatBody),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('rejects empty Bearer token', async () => {
    const res = await app.request('/v1/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ',
      },
      body: JSON.stringify(chatBody),
    });

    expect(res.status).toBe(401);
  });

  it('accepts a valid session token past auth (may fail later on upstream)', async () => {
    const sessionRes = await app.request('/v1/session', { method: 'POST' });
    const { sessionToken } = await sessionRes.json();

    const res = await app.request('/v1/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(chatBody),
    });

    // Auth passed: not 401. May be 200 (SSE) or error from Anthropic with fake key.
    // With a fake key the stream may still open (200) and emit an error event,
    // or return a non-401 status before streaming.
    expect(res.status).not.toBe(401);
  });
});
