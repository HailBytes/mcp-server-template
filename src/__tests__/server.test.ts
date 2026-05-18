/**
 * @file src/__tests__/server.test.ts
 * Integration-style tests for McpServer, factory helpers, middleware classes,
 * and audit logging.
 */

import { createMcpServer, defineTools, McpServer, ToolNotFoundError } from '../index.js';
import { AuthMiddleware } from '../middleware/auth.js';
import { AuditLogger } from '../middleware/audit-logger.js';
import type { ToolDefinition, ToolResult } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTool(name: string): ToolDefinition {
  return {
    name,
    description: `Test tool: ${name}`,
    inputSchema: { type: 'object', properties: {} },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handler: async (_input, _ctx): Promise<ToolResult> => ({
      content: [{ type: 'text', text: `Result from ${name}` }],
    }),
  };
}

// ---------------------------------------------------------------------------
// createMcpServer / McpServerInstance
// ---------------------------------------------------------------------------

describe('createMcpServer', () => {
  it('returns an object with start, stop, and callTool methods', async () => {
    const server = await createMcpServer({
      name: 'test-server',
      version: '1.0.0',
      transport: 'stdio',
      tools: [],
    });

    expect(typeof server.start).toBe('function');
    expect(typeof server.stop).toBe('function');
    expect(typeof server.callTool).toBe('function');
  });

  it('start() and stop() resolve without throwing', async () => {
    const server = await createMcpServer({
      name: 'test-server',
      version: '1.0.0',
      transport: 'stdio',
      tools: [],
    });

    await expect(server.start()).resolves.toBeUndefined();
    await expect(server.stop()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// callTool — basic invocation
// ---------------------------------------------------------------------------

describe('McpServer.callTool', () => {
  it('throws ToolNotFoundError when the tool does not exist', async () => {
    const server = new McpServer({
      name: 'test-server',
      version: '1.0.0',
      transport: 'stdio',
      tools: [],
    });

    await expect(server.callTool('nonexistent', {})).rejects.toBeInstanceOf(
      ToolNotFoundError,
    );
  });

  it('calls the registered tool and returns a ToolResult', async () => {
    const echoTool: ToolDefinition = {
      name: 'echo',
      description: 'Echoes the input',
      inputSchema: { type: 'object' },
      handler: async (input) => ({
        content: [{ type: 'text', text: JSON.stringify(input) }],
      }),
    };

    const server = new McpServer({
      name: 'test-server',
      version: '1.0.0',
      transport: 'stdio',
      tools: [echoTool],
    });

    const result = await server.callTool('echo', { msg: 'hello' });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('hello');
  });

  it('passes a ToolCallContext with a requestId and startedAt to the handler', async () => {
    let capturedRequestId: string | undefined;
    let capturedStartedAt: Date | undefined;

    const tool: ToolDefinition = {
      name: 'context-inspector',
      description: 'Captures context',
      inputSchema: {},
      handler: async (_input, ctx) => {
        capturedRequestId = ctx.requestId;
        capturedStartedAt = ctx.startedAt;
        return { content: [{ type: 'text', text: 'ok' }] };
      },
    };

    const server = new McpServer({
      name: 'test-server',
      version: '1.0.0',
      transport: 'stdio',
      tools: [tool],
    });

    await server.callTool('context-inspector', {});

    expect(typeof capturedRequestId).toBe('string');
    expect(capturedRequestId!.length).toBeGreaterThan(0);
    expect(capturedStartedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// RateLimiter — via McpServer
// ---------------------------------------------------------------------------

describe('McpServer rate limiting', () => {
  it('blocks requests after the rate limit is exceeded', async () => {
    const tool = makeTool('limited');
    const server = new McpServer({
      name: 'test-server',
      version: '1.0.0',
      transport: 'stdio',
      tools: [tool],
      rateLimit: { requestsPerMinute: 2 },
    });

    // First two calls should succeed.
    await server.callTool('limited', {}, 'client-A');
    await server.callTool('limited', {}, 'client-A');

    // Third call should throw RateLimitError.
    await expect(
      server.callTool('limited', {}, 'client-A'),
    ).rejects.toThrow('Rate limit exceeded');
  });

  it('does not block a different client from a rate-limited one', async () => {
    const tool = makeTool('limited2');
    const server = new McpServer({
      name: 'test-server',
      version: '1.0.0',
      transport: 'stdio',
      tools: [tool],
      rateLimit: { requestsPerMinute: 1 },
    });

    await server.callTool('limited2', {}, 'client-X');
    // client-X is now blocked, but client-Y should still get through.
    await expect(
      server.callTool('limited2', {}, 'client-Y'),
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AuthMiddleware
// ---------------------------------------------------------------------------

describe('AuthMiddleware', () => {
  it('type=none always returns ok=true regardless of token', () => {
    const mw = new AuthMiddleware({ type: 'none' });
    expect(mw.validate(undefined).ok).toBe(true);
    expect(mw.validate('').ok).toBe(true);
    expect(mw.validate('anything').ok).toBe(true);
  });

  it('type=api-key returns ok=true for the correct secret', () => {
    const mw = new AuthMiddleware({ type: 'api-key', secret: 'supersecret' });
    expect(mw.validate('supersecret').ok).toBe(true);
  });

  it('type=api-key returns ok=false for the wrong secret', () => {
    const mw = new AuthMiddleware({ type: 'api-key', secret: 'supersecret' });
    const result = mw.validate('wrongsecret');
    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('type=api-key returns ok=false for undefined token', () => {
    const mw = new AuthMiddleware({ type: 'api-key', secret: 'supersecret' });
    expect(mw.validate(undefined).ok).toBe(false);
  });

  it('type=jwt returns ok=true for a non-empty token', () => {
    const mw = new AuthMiddleware({ type: 'jwt', secret: 'jwtsecret' });
    expect(mw.validate('some.jwt.token').ok).toBe(true);
  });

  it('type=jwt returns ok=false for an empty/undefined token', () => {
    const mw = new AuthMiddleware({ type: 'jwt' });
    expect(mw.validate(undefined).ok).toBe(false);
    expect(mw.validate('').ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// defineTools
// ---------------------------------------------------------------------------

describe('defineTools', () => {
  it('returns the same tools array when names are unique', () => {
    const tools = [makeTool('a'), makeTool('b'), makeTool('c')];
    const result = defineTools(tools);
    expect(result).toHaveLength(3);
  });

  it('throws when two tools share the same name', () => {
    const tools = [makeTool('dup'), makeTool('dup')];
    expect(() => defineTools(tools)).toThrow(/duplicate tool name/i);
  });

  it('throws on the first duplicate even when other names are unique', () => {
    const tools = [makeTool('unique'), makeTool('dup'), makeTool('dup')];
    expect(() => defineTools(tools)).toThrow(/dup/);
  });
});

// ---------------------------------------------------------------------------
// AuditLogger
// ---------------------------------------------------------------------------

describe('AuditLogger', () => {
  it('logs a server_start event to stdout without throwing', () => {
    const logger = new AuditLogger({ destination: 'stdout' });
    expect(() =>
      logger.log({ type: 'server_start', ts: new Date().toISOString() }),
    ).not.toThrow();
  });

  it('includes the event fields in the stdout output', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const logger = new AuditLogger({ destination: 'stdout' });
    logger.log({
      type: 'tool_call',
      toolName: 'echo',
      requestId: 'req-001',
      durationMs: 42,
      ts: '2024-01-01T00:00:00.000Z',
    });

    expect(spy).toHaveBeenCalled();
    const logged = spy.mock.calls[0][0] as string;
    expect(logged).toContain('tool_call');
    expect(logged).toContain('echo');

    spy.mockRestore();
  });
});
