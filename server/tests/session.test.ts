import './setup.js';
import { describe, it, expect, beforeAll } from 'vitest';
import type { App } from '../src/app.js';

let app: App;

beforeAll(async () => {
  const mod = await import('../src/app.js');
  app = mod.createApp();
});

describe('POST /v1/session', () => {
  it('creates an anonymous session with token and expiry', async () => {
    const res = await app.request('/v1/session', { method: 'POST' });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(typeof body.sessionToken).toBe('string');
    expect(body.sessionToken.length).toBeGreaterThan(20);
    expect(typeof body.expiresAt).toBe('string');

    const expires = new Date(body.expiresAt);
    expect(Number.isNaN(expires.getTime())).toBe(false);
    expect(expires.getTime()).toBeGreaterThan(Date.now());

    // JWT has three base64url segments
    expect(body.sessionToken.split('.')).toHaveLength(3);
  });

  it('issues unique tokens on successive calls', async () => {
    const a = await (await app.request('/v1/session', { method: 'POST' })).json();
    const b = await (await app.request('/v1/session', { method: 'POST' })).json();
    expect(a.sessionToken).not.toBe(b.sessionToken);
  });
});
