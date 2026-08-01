import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { config } from '../config.js';
import type { SessionClaims } from '../types.js';

const encoder = new TextEncoder();
const secretKey = encoder.encode(config.sessionSecret);

const ISSUER = 'torq-chat-bff';
const AUDIENCE = 'torq-chat-client';

export interface CreatedSession {
  sessionToken: string;
  expiresAt: string;
  sessionId: string;
}

export async function createSession(): Promise<CreatedSession> {
  const sessionId = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + config.sessionTtlSeconds;

  const sessionToken = await new SignJWT({ sub: sessionId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setJti(randomUUID())
    .sign(secretKey);

  return {
    sessionToken,
    expiresAt: new Date(exp * 1000).toISOString(),
    sessionId,
  };
}

export async function verifySessionToken(
  token: string,
): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, secretKey, {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: ['HS256'],
  });

  return claimsFromPayload(payload);
}

function claimsFromPayload(payload: JWTPayload): SessionClaims {
  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  const iat = typeof payload.iat === 'number' ? payload.iat : 0;
  const exp = typeof payload.exp === 'number' ? payload.exp : 0;

  if (!sub || !exp) {
    throw new Error('Invalid session token claims');
  }

  return { sub, iat, exp };
}
