import { config } from '../config.js';

interface Bucket {
  count: number;
  windowStart: number;
}

/**
 * Simple in-memory sliding-window rate limiter keyed by session id.
 * Suitable for single-process Phase 1. Not shared across replicas.
 */
class InMemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly max: number;
  private readonly windowMs: number;
  private cleanupCounter = 0;

  constructor(max: number, windowMs: number) {
    this.max = max;
    this.windowMs = windowMs;
  }

  /**
   * Record a hit for `key`. Returns whether the request is allowed,
   * remaining quota, and retry-after seconds if limited.
   */
  consume(key: string): {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  } {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket || now - bucket.windowStart >= this.windowMs) {
      bucket = { count: 0, windowStart: now };
      this.buckets.set(key, bucket);
    }

    if (bucket.count >= this.max) {
      const retryAfterMs = this.windowMs - (now - bucket.windowStart);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    bucket.count += 1;
    this.maybeCleanup(now);

    return {
      allowed: true,
      remaining: Math.max(0, this.max - bucket.count),
      retryAfterSeconds: 0,
    };
  }

  /** Test helper — clear all state. */
  reset(): void {
    this.buckets.clear();
  }

  private maybeCleanup(now: number): void {
    // Opportunistic cleanup every ~100 hits to avoid unbounded growth.
    this.cleanupCounter += 1;
    if (this.cleanupCounter < 100) return;
    this.cleanupCounter = 0;
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.windowStart >= this.windowMs) {
        this.buckets.delete(key);
      }
    }
  }
}

export const sessionRateLimiter = new InMemoryRateLimiter(
  config.rateLimitMax,
  config.rateLimitWindowMs,
);

/** Throttle anonymous session minting by client IP (open-proxy mitigation). */
export const sessionMintRateLimiter = new InMemoryRateLimiter(
  20, // max new sessions
  10 * 60 * 1000, // per 10 minutes per IP
);

/** Soft global daily token budget tracker (input + output). */
class DailyTokenBudget {
  private dayKey = '';
  private used = 0;

  private ensureToday(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.dayKey) {
      this.dayKey = today;
      this.used = 0;
    }
  }

  getUsed(): number {
    this.ensureToday();
    return this.used;
  }

  wouldExceed(additional: number, budget: number): boolean {
    if (budget <= 0) return false;
    this.ensureToday();
    return this.used + additional > budget;
  }

  add(tokens: number): void {
    this.ensureToday();
    this.used += Math.max(0, tokens);
  }

  reset(): void {
    this.dayKey = '';
    this.used = 0;
  }
}

export const dailyTokenBudget = new DailyTokenBudget();
