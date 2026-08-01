import './setup.js';
import { describe, it, expect, beforeAll } from 'vitest';
import type { App } from '../src/app.js';

let app: App;

beforeAll(async () => {
  const mod = await import('../src/app.js');
  app = mod.createApp();
});

describe('GET /health', () => {
  it('returns ok and version', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, version: '1.0.0' });
  });
});
