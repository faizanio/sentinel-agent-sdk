import type { EventType, RecorderOptions, Trace, TraceEvent } from "./types.js";
import { Sentinel } from "./sentinel.js";

let _eventCounter = 0;

function nextEventId(): string {
  return `evt_${Date.now()}_${++_eventCounter}`;
}

export class Recorder {
  private readonly traceId: string;
  private readonly agentName: string;
  private readonly startedAt: number;
  private readonly events: TraceEvent[] = [];
  private finished = false;

  constructor(options: RecorderOptions) {
    this.traceId = options.traceId;
    this.agentName = options.agentName;
    this.startedAt = Date.now();
  }

  record(type: EventType, data: Record<string, unknown> = {}): void {
    if (this.finished) return;

    const event: TraceEvent = {
      id: nextEventId(),
      type,
      timestamp: Date.now(),
      data,
    };

    this.events.push(event);
  }

  finish(): Trace {
    if (this.finished) {
      throw new Error(`[Sentinel] Recorder for trace ${this.traceId} already finished`);
    }

    this.finished = true;

    const finishedAt = Date.now();

    const trace: Trace = {
      id: this.traceId,
      agentName: this.agentName,
      startedAt: this.startedAt,
      finishedAt,
      duration: finishedAt - this.startedAt,
      events: [...this.events],
    };

    Sentinel.register(trace);

    return trace;
  }

  get id(): string {
    return this.traceId;
  }
}
