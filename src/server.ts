/**
 * @file src/server.ts
 * Core McpServer implementation.
 */

import { randomUUID } from 'crypto';
import type {
  McpServerInstance,
  McpServerOptions,
  ToolDefinition,
  ToolResult,
} from './types.js';
import { AuthMiddleware } from './middleware/auth.js';
import { RateLimiter } from './middleware/rate-limiter.js';
import { AuditLogger } from './middleware/audit-logger.js';
import { withTimeout } from './tool-runner.js';

// ---------------------------------------------------------------------------
// Custom error types
// ---------------------------------------------------------------------------

/** Thrown when callTool is invoked with a name that has no registered handler. */
export class ToolNotFoundError extends Error {
  constructor(toolName: string) {
    super(`Tool not found: "${toolName}"`);
    this.name = 'ToolNotFoundError';
  }
}

/** Thrown when a request fails authentication. */
export class AuthError extends Error {
  constructor(reason: string) {
    super(`Authentication failed: ${reason}`);
    this.name = 'AuthError';
  }
}

/** Thrown when a client exceeds the configured rate limit. */
export class RateLimitError extends Error {
  constructor(retryAfterMs: number) {
    super(`Rate limit exceeded. Retry after ${retryAfterMs}ms.`);
    this.name = 'RateLimitError';
  }
}

// ---------------------------------------------------------------------------
// McpServer
// ---------------------------------------------------------------------------

/**
 * In-memory MCP server that wires together auth, rate-limiting, and audit
 * logging around a registry of tool handlers.
 */
export class McpServer implements McpServerInstance {
  private readonly options: McpServerOptions;
  private readonly tools: Map<string, ToolDefinition>;
  private readonly auth: AuthMiddleware;
  private readonly rateLimiter: RateLimiter | null;
  private readonly audit: AuditLogger;
  private running = false;

  constructor(options: McpServerOptions) {
    this.options = options;

    // Build tool registry.
    this.tools = new Map();
    for (const tool of options.tools) {
      this.tools.set(tool.name, tool);
    }

    // Auth middleware — defaults to 'none' if not specified.
    this.auth = new AuthMiddleware(options.auth ?? { type: 'none' });

    // Rate limiter — only created when a rateLimit config is provided.
    this.rateLimiter = options.rateLimit
      ? new RateLimiter(options.rateLimit)
      : null;

    // Audit logger — defaults to stdout.
    this.audit = new AuditLogger(options.audit ?? { destination: 'stdout' });
  }

  /** Start the server and emit a server_start audit event. */
  async start(): Promise<void> {
    this.running = true;
    this.audit.log({
      type: 'server_start',
      ts: new Date().toISOString(),
    });
  }

  /** Stop the server and emit a server_stop audit event. */
  async stop(): Promise<void> {
    this.running = false;
    this.audit.log({
      type: 'server_stop',
      ts: new Date().toISOString(),
    });
  }

  /**
   * Invoke a registered tool by name.
   *
   * For this MVP, `clientId` doubles as the bearer/API-key token when auth is
   * enabled. In a real transport layer the token would come from the HTTP
   * header or handshake.
   *
   * @param name     - Tool name to invoke.
   * @param input    - Unvalidated input payload passed to the handler.
   * @param clientId - Caller identity (also used as auth token in MVP).
   */
  async callTool(
    name: string,
    input: unknown,
    clientId?: string,
  ): Promise<ToolResult> {
    const requestId = randomUUID();
    const startedAt = new Date();
    const effectiveClientId = clientId ?? 'anonymous';

    // --- Authentication ---
    if (this.options.auth && this.options.auth.type !== 'none') {
      const authResult = this.auth.validate(clientId);
      if (!authResult.ok) {
        this.audit.log({
          type: 'auth_failure',
          toolName: name,
          clientId: effectiveClientId,
          requestId,
          error: authResult.reason,
          ts: new Date().toISOString(),
        });
        throw new AuthError(authResult.reason ?? 'unknown reason');
      }
    }

    // --- Rate Limiting ---
    if (this.rateLimiter) {
      const rlResult = this.rateLimiter.check(effectiveClientId);
      if (!rlResult.allowed) {
        this.audit.log({
          type: 'rate_limited',
          toolName: name,
          clientId: effectiveClientId,
          requestId,
          ts: new Date().toISOString(),
        });
        throw new RateLimitError(rlResult.retryAfterMs ?? 0);
      }
    }

    // --- Tool lookup ---
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ToolNotFoundError(name);
    }

    // --- Invocation ---
    const ctx = {
      toolName: name,
      clientId: effectiveClientId,
      requestId,
      startedAt,
    };

    const handlerPromise = tool.handler(input, ctx);
    const result = this.options.toolTimeoutMs
      ? await withTimeout(handlerPromise, this.options.toolTimeoutMs, name)
      : await handlerPromise;
    const durationMs = Date.now() - startedAt.getTime();

    this.audit.log({
      type: 'tool_call',
      toolName: name,
      clientId: effectiveClientId,
      requestId,
      durationMs,
      ts: new Date().toISOString(),
    });

    return result;
  }
}
