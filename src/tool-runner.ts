/**
 * @file src/tool-runner.ts
 * Utility for running tool handlers with an optional timeout.
 */

/** Thrown when a tool handler does not resolve within the allotted time. */
export class ToolTimeoutError extends Error {
  readonly toolName: string;
  readonly timeoutMs: number;

  constructor(toolName: string, timeoutMs: number) {
    super(`Tool "${toolName}" timed out after ${timeoutMs}ms`);
    this.name = 'ToolTimeoutError';
    this.toolName = toolName;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Races `promise` against a timer.  If the timer fires first, rejects with
 * a `ToolTimeoutError`; otherwise resolves/rejects with the original promise's
 * outcome.
 *
 * @param promise   - The async operation to time-box.
 * @param timeoutMs - Maximum number of milliseconds to wait.
 * @param toolName  - Name of the tool (used in the error message).
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  toolName: string,
): Promise<T> {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timerId = setTimeout(() => {
      reject(new ToolTimeoutError(toolName, timeoutMs));
    }, timeoutMs);
    // Allow the process / test-runner to exit even if the timeout is pending.
    timerId.unref?.();
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    clearTimeout(timerId);
  }
}
