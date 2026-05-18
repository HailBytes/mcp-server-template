/**
 * @file src/factory.ts
 * High-level factory helpers for creating and configuring MCP servers.
 */

import type { McpServerInstance, McpServerOptions, ToolDefinition } from './types.js';
import { McpServer } from './server.js';

/**
 * Construct and return an McpServerInstance from the given options.
 *
 * @param options - Full server configuration.
 * @returns A ready-to-start McpServerInstance.
 */
export async function createMcpServer(
  options: McpServerOptions,
): Promise<McpServerInstance> {
  return new McpServer(options);
}

/**
 * Validate a list of tool definitions and return them unchanged.
 *
 * Throws if any two tools share the same name (names must be unique within
 * a single server instance).
 *
 * @param tools - Array of tool definitions.
 * @returns The same array after validation.
 */
export function defineTools(tools: ToolDefinition[]): ToolDefinition[] {
  const seen = new Set<string>();
  for (const tool of tools) {
    if (seen.has(tool.name)) {
      throw new Error(
        `defineTools: duplicate tool name "${tool.name}". Tool names must be unique.`,
      );
    }
    seen.add(tool.name);
  }
  return tools;
}
