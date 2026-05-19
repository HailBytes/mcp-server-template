     1|# Changelog
     2|
     3|All notable changes to this project will be documented in this file.
     4|
     5|The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
     6|and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
     7|
## [Unreleased]

### Added
- Initial scaffold: project structure, TypeScript configuration, and package metadata.
- Added `StdioTransport` — newline-delimited JSON-RPC over stdin/stdout.
- Added `withTimeout` / `ToolTimeoutError` for tool execution timeouts.
- Added `burstLimit` support to `RateLimiter` (5-second sub-window enforcement).
- Added `echo-server` and `authenticated-server` example scripts under `src/examples/`.
- Added `SECURITY.md` with vulnerability reporting guidance and production hardening tips.
    12|
    13|[Unreleased]: https://github.com/HailBytes/mcp-server-template/compare/HEAD...HEAD
    14|