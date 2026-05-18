/**
 * @file src/transport/stdio.ts
 * Newline-delimited JSON-RPC transport over stdin/stdout.
 *
 * Message format (inbound):
 *   { id: string, method: 'tools/call', params: { name: string, arguments: unknown } }
 *
 * Response format (outbound):
 *   { id: string, result?: ToolResult, error?: { code: number, message: string } }
 *
 * On startup, emits an initialization notification:
 *   { jsonrpc: '2.0', method: 'notifications/initialized', params: { serverInfo: { name, version } } }
 */

import * as readline from 'readline';
import type { McpServerInstance, ToolResult } from '../types.js';
import { ToolNotFoundError } from '../server.js';

// JSON-RPC error codes used by MCP
const ERR_METHOD_NOT_FOUND = -32601; // tool not found
const ERR_INTERNAL = -32000;         // auth / rate-limit / general internal error
const ERR_INVALID_REQUEST = -32600;  // malformed message

interface InboundMessage {
  id: string;
  method: string;
  params?: {
    name?: string;
    arguments?: unknown;
  };
}

interface OutboundSuccess {
  id: string;
  result: ToolResult;
}

interface OutboundError {
  id: string;
  error: { code: number; message: string };
}

type OutboundMessage = OutboundSuccess | OutboundError;

export interface StdioTransportOptions {
  name: string;
  version: string;
}

/**
 * Binds an `McpServerInstance` to process.stdin / process.stdout using
 * newline-delimited JSON-RPC messages.
 */
export class StdioTransport {
  private readonly server: McpServerInstance;
  private readonly options: StdioTransportOptions;
  private rl: readline.Interface | null = null;

  constructor(server: McpServerInstance, options: StdioTransportOptions) {
    this.server = server;
    this.options = options;
  }

  /** Start the server and begin reading from stdin. */
  async start(): Promise<void> {
    await this.server.start();

    // Emit the initialization notification so clients know we are ready.
    const initNotification = {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {
        serverInfo: {
          name: this.options.name,
          version: this.options.version,
        },
      },
    };
    process.stdout.write(JSON.stringify(initNotification) + '\n');

    // Set up line-by-line reading from stdin.
    this.rl = readline.createInterface({
      input: process.stdin,
      terminal: false,
    });

    this.rl.on('line', (line: string) => {
      void this.handleLine(line.trim());
    });
  }

  /** Stop reading from stdin and shut down the server. */
  async stop(): Promise<void> {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    await this.server.stop();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async handleLine(line: string): Promise<void> {
    if (!line) return;

    let msg: InboundMessage;

    // Parse the JSON — return an invalid-request error on parse failure.
    try {
      msg = JSON.parse(line) as InboundMessage;
    } catch {
      // We have no id to echo back; use null.
      this.writeResponse({
        id: 'null',
        error: { code: ERR_INVALID_REQUEST, message: 'Parse error: invalid JSON' },
      });
      return;
    }

    const { id, method, params } = msg;

    if (!id || method !== 'tools/call') {
      this.writeResponse({
        id: id ?? 'null',
        error: {
          code: ERR_INVALID_REQUEST,
          message: `Unsupported method: "${method ?? ''}"`,
        },
      });
      return;
    }

    const toolName = params?.name;
    const toolArgs = params?.arguments ?? {};

    if (typeof toolName !== 'string' || !toolName) {
      this.writeResponse({
        id,
        error: {
          code: ERR_INVALID_REQUEST,
          message: 'params.name must be a non-empty string',
        },
      });
      return;
    }

    // Dispatch to the server — it handles auth, rate limiting, and invocation.
    try {
      const result = await this.server.callTool(toolName, toolArgs);
      this.writeResponse({ id, result });
    } catch (err: unknown) {
      if (err instanceof ToolNotFoundError) {
        this.writeResponse({
          id,
          error: { code: ERR_METHOD_NOT_FOUND, message: (err as Error).message },
        });
      } else {
        this.writeResponse({
          id,
          error: {
            code: ERR_INTERNAL,
            message: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }
  }

  private writeResponse(response: OutboundMessage): void {
    process.stdout.write(JSON.stringify(response) + '\n');
  }
}
