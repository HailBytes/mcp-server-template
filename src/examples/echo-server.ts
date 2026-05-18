/**
 * @file src/examples/echo-server.ts
 * A minimal MCP server example with two tools: 'echo' and 'ping'.
 *
 * Run with:
 *   node --loader ts-node/esm src/examples/echo-server.ts
 *
 * The server listens on stdin for newline-delimited JSON-RPC messages and
 * writes responses to stdout.
 */

import { createMcpServer, defineTools, StdioTransport } from '../index.js';
import type { ToolDefinition } from '../types.js';

const tools: ToolDefinition[] = defineTools([
  {
    name: 'echo',
    description: 'Returns the input payload as text.',
    inputSchema: { type: 'object' },
    async handler(input) {
      return {
        content: [{ type: 'text', text: JSON.stringify(input) }],
      };
    },
  },
  {
    name: 'ping',
    description: 'Returns { pong: true, ts: <ISO timestamp> }.',
    inputSchema: { type: 'object', properties: {} },
    async handler() {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ pong: true, ts: new Date().toISOString() }),
          },
        ],
      };
    },
  },
]);

const server = await createMcpServer({
  name: 'echo-server',
  version: '0.0.1',
  transport: 'stdio',
  tools,
  rateLimit: { requestsPerMinute: 60 },
});

const transport = new StdioTransport(server, {
  name: 'echo-server',
  version: '0.0.1',
});

await transport.start();
