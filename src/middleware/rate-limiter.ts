/**
 * @file src/middleware/rate-limiter.ts
 * Sliding-window per-client rate limiter for MCP servers.
 *
 * Supports an optional `burstLimit` that caps the number of requests allowed
 * in any 5-second sub-window.  Both the per-minute limit AND the burst limit
 * must be satisfied for a request to be allowed.
 */

import type { RateLimitConfig } from '../types.js';

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

const WINDOW_MS = 60_000;   // 60 seconds  – main window
const BURST_WINDOW_MS = 5_000; // 5 seconds – burst sub-window

/**
 * Per-client sliding-window rate limiter.
 *
 * Maintains a list of call timestamps per clientId and evicts entries
 * older than the 60-second window on every check.
 *
 * When `burstLimit` is configured, a parallel 5-second sub-window is also
 * maintained; requests are denied if either the per-minute limit **or** the
 * burst limit is exceeded.
 */
export class RateLimiter {
  private readonly config: RateLimitConfig;
  private readonly windows: Map<string, number[]> = new Map();
  private readonly burstWindows: Map<string, number[]> = new Map();

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
    const cutoff60 = now - WINDOW_MS;
    const cutoff5 = now - BURST_WINDOW_MS;

    // ---------- Per-minute window ----------
    let timestamps = this.windows.get(clientId) ?? [];
    timestamps = timestamps.filter((t) => t > cutoff60);

    const limit = this.config.requestsPerMinute;

    if (timestamps.length >= limit) {
      const oldestTs = timestamps[0];
      const retryAfterMs = oldestTs + WINDOW_MS - now;
      this.windows.set(clientId, timestamps);
      return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    // ---------- Burst sub-window (optional) ----------
    if (this.config.burstLimit !== undefined) {
      let burstTimestamps = this.burstWindows.get(clientId) ?? [];
      burstTimestamps = burstTimestamps.filter((t) => t > cutoff5);

      if (burstTimestamps.length >= this.config.burstLimit) {
        const oldestBurst = burstTimestamps[0];
        const retryAfterMs = oldestBurst + BURST_WINDOW_MS - now;
        this.burstWindows.set(clientId, burstTimestamps);
        // Also persist the un-mutated per-minute list so we don't lose state.
        this.windows.set(clientId, timestamps);
        return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
      }

      // Record in burst window.
      burstTimestamps.push(now);
      this.burstWindows.set(clientId, burstTimestamps);
    }

    // Record in per-minute window and allow.
    timestamps.push(now);
    this.windows.set(clientId, timestamps);
    return { allowed: true };
  }
}
