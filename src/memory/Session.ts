import type { Agent } from "../agent/Agent.js";
import type { MemoryStore } from "./MemoryStore.js";
import type { RunResult } from "../types/result.types.js";

export class Session {
  constructor(
    readonly sessionId: string,
    private readonly agent: Agent,
    private readonly store: MemoryStore
  ) {}

  async run(input: string): Promise<RunResult> {
    const priorMessages = this.store.getMessages(this.sessionId);
    return this.agent._runWithSession(input, priorMessages, this.store, this.sessionId);
  }
}
