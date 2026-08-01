import type { IAgentConfig } from "../types/agent.types.js";
import type { IMessage } from "../types/message.types.js";
import type { RunResult } from "../types/result.types.js";
import type { Recorder } from "../reliability/recorder.js";

export interface RunContext {
  readonly config: IAgentConfig;
  readonly input: string;
  messages: IMessage[];
  iteration: number;
  metadata: Record<string, unknown>;
  recorder: Recorder;
}

export type Next = () => Promise<RunResult>;

export type Middleware = (context: RunContext, next: Next) => Promise<RunResult>;
