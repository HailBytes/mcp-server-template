# Security Policy

## Supported Versions

| Version | Status             |
| ------- | ------------------ |
| 0.0.x   | Incubation — not yet supported |

This project is in early incubation. No version is currently receiving security
patches on a guaranteed timeline. Once a stable release is published this table
will be updated accordingly.

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue to report a security vulnerability.**

Instead, send a detailed report to **security@hailbytes.com** including:

- A description of the vulnerability and its potential impact.
- Steps to reproduce or a proof-of-concept.
- Affected versions (if known).
- Any suggested mitigations or fixes you may have.

You can expect an acknowledgement within **48 hours**. We will work with you to
understand and address the issue and, where appropriate, coordinate a public
disclosure timeline.

## Security Considerations When Using This Template

When building production servers on top of this template, keep the following
hardening guidelines in mind:

- **Rotate secrets regularly.** API keys and JWT secrets embedded in
  configuration should be stored in a secrets manager (e.g. AWS Secrets Manager,
  HashiCorp Vault) and rotated on a scheduled basis. Never commit credentials to
  source control.

- **Use full JWT verification in production.** The bundled JWT middleware
  performs only a presence check. Replace it with a robust library (e.g.
  [`jose`](https://github.com/panva/jose) or
  [`jsonwebtoken`](https://github.com/auth0/node-jsonwebtoken)) that verifies the
  signature, expiry (`exp`), issuer (`iss`), and audience (`aud`) claims against
  your identity provider.

- **Configure rate limits appropriate to your workload.** The default values
  are illustrative. Tune `requestsPerMinute` and `burstLimit` based on expected
  traffic patterns, and consider per-user as well as global limits to prevent
  abuse.

- **Enable TLS for all network-facing transports.** When exposing an MCP server
  over HTTP or SSE, terminate TLS at the load balancer or reverse proxy layer and
  ensure all client-to-server communication is encrypted in transit. Never expose
  an unencrypted transport to the public internet.
