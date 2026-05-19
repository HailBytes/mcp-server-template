---
title: "Production-Ready MCP Servers in 60 Seconds (Auth, Rate Limits, Audit Logs Included)"
published: false
description: A TypeScript scaffold for production MCP servers that ships with pluggable auth, per-tool rate limiting, structured audit logs, and OpenTelemetry — so you can build the actual tools and not reinvent the boring parts.
tags: ai, llm, typescript, node
cover_image: <COVER_IMAGE_URL>
canonical_url: https://github.com/hailbytes/mcp-server-template
published_at: 2026-05-22 13:00 +0000
---

<!--
COVER IMAGE PROMPT (1000x420, 2.4:1 banner):

Flat vector illustration, isometric perspective. A stacked server block being assembled out
of stylized layers (like clean architectural strata). Floating around the stack: a small key
icon (auth), a circular gauge (rate limit), a scroll / log lines (audit), and an eye / radar
ring (observability). A small geometric robot silhouette in the lower-left foreground.
Dark navy (#0a1628) background, electric cyan (#00d4ff) primary, amber (#ffb347) for the
orbiting icons, soft white highlights on layer edges. Banner composition, asymmetric depth,
generous negative space on the right. No text in the image.

Suggested generators: Midjourney v6+ with `--ar 1000:420 --style raw`, DALL-E 3, or Flux.
After generation, host on Cloudinary or GitHub raw and replace <COVER_IMAGE_URL> above.
-->

Every MCP server tutorial I've read shows you how to register a single tool that echoes a string. Then they wave at "production concerns" and end the post.

Production concerns *are* the post.

[`@hailbytes/mcp-server-template`](https://www.npmjs.com/package/@hailbytes/mcp-server-template) is the opinionated TypeScript scaffold I use when I need to ship an MCP server that an enterprise will actually run. It comes with:

- **Auth** — pluggable middleware for API keys, OAuth, and JWT
- **Rate limiting** — per-client and per-tool, so one runaway agent can't take the whole server down
- **Audit logging** — structured logs for every tool call and session event
- **OpenTelemetry** — traces and metrics, so you can actually debug what your model did
- **Multi-transport** — SSE, stdio, and HTTP, picked at scaffold time

## Scaffold a new server

```bash
npx @hailbytes/create-mcp-server my-server --transport=sse
```

You get a directory you can `cd` into and `npm run dev` immediately.

## Or embed it programmatically

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

That's the entire "production MCP server" diff vs. the tutorial echo example.

Pair it with [`@hailbytes/mcp-security-scanner`](https://www.npmjs.com/package/@hailbytes/mcp-security-scanner) and you'll have a server that comes up secure by default and stays that way as you add tools.

```bash
npx @hailbytes/create-mcp-server my-server
```

Source: [github.com/hailbytes/mcp-server-template](https://github.com/hailbytes/mcp-server-template) — MIT licensed.
