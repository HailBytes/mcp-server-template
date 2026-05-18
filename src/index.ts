/**
 * @file src/index.ts
 * Public API for @hailbytes/mcp-server-template.
 *
 * Usage:
 *   import { createMcpServer, defineTools } from '@hailbytes/mcp-server-template';
 */

// Factory helpers
export { createMcpServer, defineTools } from './factory.js';

// Server class and custom errors
export { McpServer, ToolNotFoundError, AuthError, RateLimitError } from './server.js';

// Middleware classes (exported for advanced users who want to compose them)
export { AuthMiddleware } from './middleware/auth.js';
export { RateLimiter } from './middleware/rate-limiter.js';
export { AuditLogger } from './middleware/audit-logger.js';

// All shared types
export type {
  Transport,
  AuthConfig,
  RateLimitConfig,
  AuditConfig,
  ToolCallContext,
  ContentItem,
  ToolResult,
  ToolDefinition,
  JsonSchema,
  McpServerOptions,
  McpServerInstance,
} from './types.js';

// Audit event types
export type { AuditEvent, AuditEventType } from './middleware/audit-logger.js';
