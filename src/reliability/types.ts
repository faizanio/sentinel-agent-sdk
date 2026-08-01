export type EventType =
  | "run.started"
  | "run.completed"
  | "run.failed"
  | "llm.started"
  | "llm.completed"
  | "tool.started"
  | "tool.completed"
  | "tool.failed"
  | "middleware.started"
  | "middleware.completed"
  | "handoff.started"
  | "handoff.completed"
  | "handoff.failed"
  | "guardrail.input"
  | "guardrail.output"
  | "guardrail.tool"
  | "memory.loaded"
  | "memory.saved"
  | "session.created"
  | "session.loaded"
  | "structured.validation"
  | "structured.retry";

export interface TraceEvent {
  id: string;
  type: EventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface Trace {
  id: string;
  agentName: string;
  startedAt: number;
  finishedAt: number;
  duration: number;
  events: TraceEvent[];
}

export interface RecorderOptions {
  agentName: string;
  traceId: string;
}
