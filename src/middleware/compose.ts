import type { RunResult } from "../types/result.types.js";
import type { Middleware, Next, RunContext } from "./Middleware.js";


export function compose(
  middlewares: Middleware[]
): (context: RunContext, kernel: () => Promise<RunResult>) => Promise<RunResult> {
  return function dispatch(
    context: RunContext,
    kernel: () => Promise<RunResult>
  ): Promise<RunResult> {
    let index = -1;

    function step(i: number): Promise<RunResult> {
      if (i <= index) {
        return Promise.reject(
          new Error("[Loom] next() called multiple times inside the same middleware")
        );
      }
      index = i;

      // All middleware exhausted — invoke the core runtime (kernel)
      if (i === middlewares.length) {
        return kernel();
      }

      const middleware = middlewares[i];
      if (!middleware) {
        // Defensive guard; should never happen with correct usage
        return kernel();
      }

      const next: Next = () => step(i + 1);

      try {
        return middleware(context, next);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return step(0);
  };
}
