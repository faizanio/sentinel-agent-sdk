import type { RunResult } from "../types/result.types.js";
import type { Middleware, RunContext } from "./Middleware.js";


export const TIMING_KEYS = {
  startedAt: "timing.startedAt",
  finishedAt: "timing.finishedAt",
  duration: "timing.duration",
} as const;


export function timingMiddleware(): Middleware {
  return async function timing(
    context: RunContext,
    next: () => Promise<RunResult>
  ): Promise<RunResult> {
    const startedAt = Date.now();
    context.metadata[TIMING_KEYS.startedAt] = startedAt;

    try {
      const result = await next();

      const finishedAt = Date.now();
      context.metadata[TIMING_KEYS.finishedAt] = finishedAt;
      context.metadata[TIMING_KEYS.duration] = finishedAt - startedAt;

      return result;
    } catch (err) {
      const finishedAt = Date.now();
      context.metadata[TIMING_KEYS.finishedAt] = finishedAt;
      context.metadata[TIMING_KEYS.duration] = finishedAt - startedAt;

      throw err;
    }
  };
}
