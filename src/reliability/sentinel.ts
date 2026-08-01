import { Recorder } from "./recorder.js";
import type { Trace } from "./types.js";

let _traceCounter = 0;

function nextTraceId(): string {
  return `trace_${Date.now()}_${++_traceCounter}`;
}

// Singleton registry — lives for the process lifetime
const store = new Map<string, Trace>();

export const Sentinel = {
  createRecorder(agentName: string): Recorder {
    const traceId = nextTraceId();
    return new Recorder({ agentName, traceId });
  },

  // Called automatically by Recorder.finish()
  register(trace: Trace): void {
    store.set(trace.id, trace);
  },

  getTrace(id: string): Trace | undefined {
    return store.get(id);
  },

  listTraces(): Trace[] {
    return Array.from(store.values());
  },

  clear(): void {
    store.clear();
  },
};
