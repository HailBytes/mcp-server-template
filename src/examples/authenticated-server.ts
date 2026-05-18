/**
 * @file src/examples/authenticated-server.ts
 * An MCP server example with API-key authentication, rate limiting (with
 * burst support), and audit logging to stdout.
 *
 * Run with:
 *   node --loader ts-node/esm src/examples/authenticated-server.ts
 *
 * To call a tool, send a newline-delimited JSON message on stdin, e.g.:
 *   echo '{"id":"1","method":"tools/call","params":{"name":"secret-data","arguments":{}}}' | \
 *     API_KEY=my-super-secret-api-key-32chars!! node --loader ts-node/esm src/examples/authenticated-server.ts
 *
 * NOTE: The API key below is a hardcoded example for demonstration purposes.
 * Replace it with a value loaded from an environment variable or secrets
 * manager before deploying to production.
 */

import { createMcpServer, defineTools, StdioTransport } from '../index.js';
import type { ToolDefinition } from '../types.js';

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const tools: ToolDefinition[] = defineTools([
  {
    name: 'secret-data',
    description: 'Returns protected data — requires a valid API key.',
    inputSchema: { type: 'object', properties: {} },
    async handler() {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ secret: 'this is protected data' }),
          },
        ],
      };
    },
  },
]);

// ---------------------------------------------------------------------------
// Server construction
// ---------------------------------------------------------------------------

const API_KEY = 'my-super-secret-api-key-32chars!!';

const server = await createMcpServer({
  name: 'authenticated-server',
  version: '0.0.1',
  transport: 'stdio',
  tools,
  auth: {
    type: 'api-key',
    secret: API_KEY,
  },
  rateLimit: {
    requestsPerMinute: 10,
    burstLimit: 20,
  },
  audit: { destination: 'stdout' },
});

const transport = new StdioTransport(server, {
  name: 'authenticated-server',
  version: '0.0.1',
});

await transport.start();
