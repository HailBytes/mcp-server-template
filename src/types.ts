/**
 * @file src/types.ts
 * Shared types for the MCP server template library.
 */

/** Supported transport mechanisms. */
export type Transport = 'sse' | 'stdio' | 'http';

/** Authentication configuration. */
export interface AuthConfig {
  type: 'api-key' | 'oauth' | 'jwt' | 'none';
  /** HTTP header name for the token (e.g. 'Authorization'). */
  header?: string;
  /** Secret for api-key and jwt validation. */
  secret?: string;
}

/** Rate limiting configuration. */
export interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit?: number;
}

/** Audit logging configuration. */
export interface AuditConfig {
  destination: 'stdout' | 'file' | 'otlp';
  filePath?: string;
  includeInputs?: boolean;
}

/** Context passed to every tool handler invocation. */
export interface ToolCallContext {
  toolName: string;
  clientId?: string;
  requestId: string;
  startedAt: Date;
}

/** Content item in a tool result. */
export interface ContentItem {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
}

/** The result returned by a tool handler. */
export interface ToolResult {
  content: ContentItem[];
  isError?: boolean;
}

/** A JSON Schema representation (opaque bag). */
export type JsonSchema = Record<string, unknown>;

/** Definition of an MCP tool. */
export interface ToolDefinition<TInput = unknown> {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  handler(input: TInput, ctx: ToolCallContext): Promise<ToolResult>;
}

/** Options for constructing an MCP server instance. */
export interface McpServerOptions {
  name: string;
  version: string;
  transport: Transport;
  tools: ToolDefinition[];
  auth?: AuthConfig;
  rateLimit?: RateLimitConfig;
  audit?: AuditConfig;
  /**
   * Optional timeout in milliseconds for each tool handler invocation.
   * When set, any tool that does not resolve within this time will be rejected
   * with a `ToolTimeoutError`.
   */
  toolTimeoutMs?: number;
}

/** Public interface of a running MCP server instance. */
export interface McpServerInstance {
  start(): Promise<void>;
  stop(): Promise<void>;
  callTool(name: string, input: unknown, clientId?: string): Promise<ToolResult>;
}
