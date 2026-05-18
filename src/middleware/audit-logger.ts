/**
 * @file src/middleware/audit-logger.ts
 * Audit logging middleware for MCP servers.
 */

import fs from 'fs';
import type { AuditConfig } from '../types.js';

/** Event types emitted by the MCP server lifecycle and tool invocations. */
export type AuditEventType =
  | 'tool_call'
  | 'auth_failure'
  | 'rate_limited'
  | 'server_start'
  | 'server_stop';

/** A structured audit event. */
export interface AuditEvent {
  type: AuditEventType;
  toolName?: string;
  clientId?: string;
  requestId?: string;
  durationMs?: number;
  error?: string;
  ts: string;
}

/**
 * Writes structured audit events to the configured destination.
 *
 * Supported destinations:
 *  - `stdout` — JSON-stringified line to `console.log`
 *  - `file`   — JSON-stringified line appended to `config.filePath`
 *  - `otlp`   — Not yet implemented; falls through to stdout with a warning
 */
export class AuditLogger {
  private readonly config: AuditConfig;

  constructor(config: AuditConfig) {
    this.config = config;
  }

  /**
   * Log an audit event according to the configured destination.
   */
  log(event: AuditEvent): void {
    const line = JSON.stringify(event);

    switch (this.config.destination) {
      case 'stdout':
        console.log(line);
        break;

      case 'file': {
        const filePath = this.config.filePath;
        if (!filePath) {
          console.warn('AuditLogger: destination=file but filePath is not set; falling back to stdout.');
          console.log(line);
          break;
        }
        fs.appendFileSync(filePath, line + '\n', 'utf8');
        break;
      }

      case 'otlp':
        console.warn('OTLP audit destination not yet implemented');
        // Fall through to stdout output so events are not silently lost.
        console.log(line);
        break;

      default:
        console.log(line);
    }
  }
}
