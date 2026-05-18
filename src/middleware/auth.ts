/**
 * @file src/middleware/auth.ts
 * Authentication middleware for MCP servers.
 */

import type { AuthConfig } from '../types.js';

export interface AuthResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validates inbound tokens against the configured auth strategy.
 */
export class AuthMiddleware {
  private readonly config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  /**
   * Validate a token string against the current auth configuration.
   * @param token - The raw token value (e.g. value of Authorization header).
   */
  validate(token: string | undefined): AuthResult {
    switch (this.config.type) {
      case 'none':
        return { ok: true };

      case 'api-key':
        if (token === this.config.secret) {
          return { ok: true };
        }
        return { ok: false, reason: 'Invalid API key.' };

      case 'jwt':
        // NOTE: Full JWT signature verification is out of scope for this MVP.
        // In production, use a library such as `jsonwebtoken` or `jose` to
        // verify the signature against config.secret and validate claims.
        if (token && token.trim().length > 0) {
          return { ok: true };
        }
        return { ok: false, reason: 'JWT token is missing or empty.' };

      case 'oauth':
        // Bearer-token presence check only. Full OAuth introspection / JWKS
        // verification should be added for production use.
        if (token && token.trim().length > 0) {
          return { ok: true };
        }
        return { ok: false, reason: 'OAuth bearer token is missing.' };

      default:
        return { ok: false, reason: 'Unknown auth type.' };
    }
  }
}
