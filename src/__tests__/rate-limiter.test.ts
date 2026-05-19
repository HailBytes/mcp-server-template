/**
 * @file src/__tests__/rate-limiter.test.ts
 * Focused unit tests for the sliding-window RateLimiter.
 */

import { RateLimiter } from '../middleware/rate-limiter.js';

describe('RateLimiter', () => {
  it('allows a request when under the limit', () => {
    const limiter = new RateLimiter({ requestsPerMinute: 5 });
    const result = limiter.check('client-1');
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBeUndefined();
  });

  it('allows up to and including the exact limit', () => {
    const limiter = new RateLimiter({ requestsPerMinute: 3 });

    const r1 = limiter.check('client-2');
    const r2 = limiter.check('client-2');
    const r3 = limiter.check('client-2');

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
  });

  it('blocks the next request after the limit is reached', () => {
    const limiter = new RateLimiter({ requestsPerMinute: 3 });

    limiter.check('client-3');
    limiter.check('client-3');
    limiter.check('client-3');

    // 4th call should be denied.
    const result = limiter.check('client-3');
    expect(result.allowed).toBe(false);
    expect(typeof result.retryAfterMs).toBe('number');
    expect(result.retryAfterMs!).toBeGreaterThan(0);
  });

  it('uses "anonymous" as the default clientId', () => {
    const limiter = new RateLimiter({ requestsPerMinute: 1 });

    const r1 = limiter.check(); // default clientId
    expect(r1.allowed).toBe(true);

    const r2 = limiter.check(); // same default clientId — now over limit
    expect(r2.allowed).toBe(false);
  });

  it('tracks different clients independently', () => {
    const limiter = new RateLimiter({ requestsPerMinute: 1 });

    limiter.check('alpha');       // alpha is now at limit
    const r = limiter.check('beta'); // beta has its own fresh window

    expect(r.allowed).toBe(true);
  });

  it('allows again after old timestamps have left the 60-second window', () => {
    const limiter = new RateLimiter({ requestsPerMinute: 2 });
    const clientId = 'time-traveller';

    // Manually inject two stale timestamps (>60 s ago) into the private map.
    const staleTs = Date.now() - 61_000;
    // Access private property via type cast for testing purposes.
    (limiter as unknown as { windows: Map<string, number[]> }).windows.set(
      clientId,
      [staleTs, staleTs],
    );

    // Even though there are 2 entries, they are outside the window,
    // so the check should evict them and allow the new call.
    const result = limiter.check(clientId);
    expect(result.allowed).toBe(true);
  });

  it('returns a positive retryAfterMs when blocked', () => {
    const limiter = new RateLimiter({ requestsPerMinute: 1 });
    limiter.check('blocker');

    const blocked = limiter.check('blocker');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    // Should be at most 60 seconds.
    expect(blocked.retryAfterMs!).toBeLessThanOrEqual(60_000);
  });
});

// ---------------------------------------------------------------------------
// Burst-limit tests
// ---------------------------------------------------------------------------

describe('RateLimiter burstLimit', () => {
  it('allows the third call in the first 5s when burstLimit=3 and requestsPerMinute=60', () => {
    const limiter = new RateLimiter({ requestsPerMinute: 60, burstLimit: 3 });
    const clientId = 'burst-client-1';

    const r1 = limiter.check(clientId);
    const r2 = limiter.check(clientId);
    const r3 = limiter.check(clientId);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    // Third call is still within the burst limit of 3.
    expect(r3.allowed).toBe(true);
  });

  it('blocks the third call in the first 5s when burstLimit=2 and requestsPerMinute=60', () => {
    const limiter = new RateLimiter({ requestsPerMinute: 60, burstLimit: 2 });
    const clientId = 'burst-client-2';

    const r1 = limiter.check(clientId);
    const r2 = limiter.check(clientId);
    // Third call exceeds the burst limit of 2.
    const r3 = limiter.check(clientId);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(false);
    expect(typeof r3.retryAfterMs).toBe('number');
  });
});

