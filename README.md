# @hailbytes/mcp-server-template

> Opinionated TypeScript scaffold for production MCP servers with built-in auth, rate limiting, audit logging, and observability.

![Status: Incubation — not yet published to npm](https://img.shields.io/badge/status-incubation-orange)

**Planned npm name:** `@hailbytes/mcp-server-template`

---

## ⚠️ Incubation Notice

This package is in early incubation and **has not yet been published to npm**. The API may change without notice. Follow [hailbytes.com](https://hailbytes.com) for release announcements.

---

## Overview

`@hailbytes/mcp-server-template` is an opinionated TypeScript scaffold for building production-grade [Model Context Protocol](https://modelcontextprotocol.io) servers. It ships batteries-included with:

- **Authentication** — pluggable auth middleware (API key, OAuth, JWT)
- **Rate limiting** — per-client and per-tool rate limits
- **Audit logging** — structured logs for every tool call and session event
- **Observability** — OpenTelemetry traces and metrics out of the box
- **Multi-transport** — SSE, stdio, and HTTP transports

---

## Planned Audience

Platform engineers, AI/LLM developers, and product teams who need to ship a secure, observable MCP server quickly without reinventing auth, rate limiting, or logging from scratch.

---

## Planned API Sketch

### Project scaffolder (recommended)

```bash
npx @hailbytes/create-mcp-server my-server --transport=sse
npx @hailbytes/create-mcp-server my-server --transport=stdio
npx @hailbytes/create-mcp-server my-server --transport=http
```

This generates a new project directory pre-wired with the template, ready to run.

### Programmatic (embedding the template)

```ts
import { createMcpServer, defineTools } from "@hailbytes/mcp-server-template";

const tools = defineTools([
  {
    name: "echo",
    description: "Echoes the input back.",
    inputSchema: { type: "object", properties: { message: { type: "string" } } },
    handler: async ({ message }) => ({ content: [{ type: "text", text: message }] }),
  },
]);

const server = await createMcpServer({
  name: "my-server",
  version: "1.0.0",
  transport: "sse",
  tools,
  auth: { type: "api-key", header: "X-Api-Key" },
  rateLimit: { requestsPerMinute: 60 },
  audit: { destination: "stdout" },
});

await server.start();
```

---

## See Also

- [@hailbytes/mcp-security-scanner](https://github.com/HailBytes/mcp-security-scanner) — audit your MCP server for security issues

---

## Links

- [hailbytes.com](https://hailbytes.com)
- [hailbytes.com/mcp](https://hailbytes.com/mcp) — MCP server documentation
- [GitHub Issues](https://github.com/HailBytes/mcp-server-template/issues)
