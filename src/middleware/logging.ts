import type { RunResult } from "../types/result.types.js";
import type { Middleware, RunContext } from "./Middleware.js";


export function loggingMiddleware(): Middleware {
  return async function logging(
    context: RunContext,
    next: () => Promise<RunResult>
  ): Promise<RunResult> {
    const { config, input } = context;
    const startedAt = new Date();
    const startMs = Date.now();

    console.log(
      `[Loom:logging] ▶  Run started` +
      `\n  Agent    : ${config.name}` +
      `\n  Time     : ${startedAt.toISOString()}` +
      `\n  Input    : ${truncate(input, 120)}`
    );

    try {
      const result = await next();

      const duration = Date.now() - startMs;

      console.log(
        `[Loom:logging] ✔  Run completed` +
        `\n  Agent    : ${config.name}` +
        `\n  Duration : ${duration}ms` +
        `\n  Output   : ${truncate(result.output ?? "(empty)", 120)}` +
        `\n  Messages : ${result.messages.length} in history`
      );

      return result;
    } catch (err) {
      const duration = Date.now() - startMs;
      const message = err instanceof Error ? err.message : String(err);

      console.error(
        `[Loom:logging] ✖  Run failed` +
        `\n  Agent    : ${config.name}` +
        `\n  Duration : ${duration}ms` +
        `\n  Error    : ${message}`
      );

      throw err;
    }
  };
}

// ─── Helpers ─────────────────────────────────

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}
