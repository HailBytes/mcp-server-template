// @hailbytes/mcp-server-template
// TODO: Implement MCP server template logic.
// Planned exports:
//   - createMcpServer(options: McpServerOptions): Promise<McpServerInstance>
//   - defineTools(tools: ToolDefinition[]): ToolDefinition[]
//   - McpServerOptions
//   - McpServerInstance
//   - ToolDefinition
//   - AuthConfig
//   - RateLimitConfig
//   - AuditConfig

export type Transport = "sse" | "stdio" | "http";

export interface AuthConfig {
  type: "api-key" | "oauth" | "jwt" | "none";
  header?: string;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
}

export interface AuditConfig {
  destination: "stdout" | "file" | "otlp";
  filePath?: string;
}

export interface ToolDefinition<TInput = Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: TInput) => Promise<unknown>;
}

export interface McpServerOptions {
  name: string;
  version: string;
  transport: Transport;
  tools: ToolDefinition[];
  auth?: AuthConfig;
  rateLimit?: RateLimitConfig;
  audit?: AuditConfig;
}

export interface McpServerInstance {
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Define a list of MCP tool handlers with full type information.
 * @param tools - Array of tool definitions.
 * @returns The same array (identity function until implementation is wired up).
 * @todo Wire up schema validation and handler wrapping.
 */
export function defineTools(tools: ToolDefinition[]): ToolDefinition[] {
  // TODO: validate schemas, wrap handlers with auth + rate-limit middleware
  return tools;
}

/**
 * Create and configure a production-ready MCP server.
 * @param options - Server configuration.
 * @returns A McpServerInstance ready to start.
 * @todo Implement server bootstrap with selected transport and middleware stack.
 */
export async function createMcpServer(
  _options: McpServerOptions,
): Promise<McpServerInstance> {
  // TODO: implement server bootstrap
  return {
    start: async () => {
      throw new Error("createMcpServer: not yet implemented");
    },
    stop: async () => {},
  };
}
