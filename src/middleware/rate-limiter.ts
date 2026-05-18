/**
 * @file src/middleware/rate-limiter.ts
 * Sliding-window per-client rate limiter for MCP servers.
 */

import type { RateLimitConfig } from '../types.js';

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

const WINDOW_MS = 60_000; // 60 seconds

/**
 * Per-client sliding-window rate limiter.
 *
 * Maintains a list of call timestamps per clientId and evicts entries
 * older than the 60-second window on every check.
 */
export class RateLimiter {
  private readonly config: RateLimitConfig;
  private readonly windows: Map<string, number[]> = new Map();

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check whether the given client is within its rate limit.
   *
   * @param clientId - Identifier for the calling client. Defaults to 'anonymous'.
   * @returns `{ allowed: true }` if within limit, or
   *          `{ allowed: false, retryAfterMs }` when the limit has been exceeded.
   */
  check(clientId: string = 'anonymous'): RateLimitResult {
    const now = Date.now();
    const cutoff = now - WINDOW_MS;

    // Retrieve or initialise the timestamp window for this client.
    let timestamps = this.windows.get(clientId) ?? [];

    // Evict timestamps outside the current 60-second window.
    timestamps = timestamps.filter((t) => t > cutoff);

    const limit = this.config.requestsPerMinute;

    if (timestamps.length >= limit) {
      // The oldest timestamp in the window determines when a slot frees up.
      const oldestTs = timestamps[0];
      const retryAfterMs = oldestTs + WINDOW_MS - now;
      this.windows.set(clientId, timestamps);
      return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    // Record this call and allow it.
    timestamps.push(now);
    this.windows.set(clientId, timestamps);
    return { allowed: true };
  }
}
