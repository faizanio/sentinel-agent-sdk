import type { IAgentConfig } from "../types/agent.types.js";
import type { RunResult } from "../types/result.types.js";
import type { IMessage } from "../types/message.types.js";
import type { ZodType } from "zod";
import { run } from "./run.js";
import { compose } from "../middleware/compose.js";
import type { Middleware, RunContext } from "../middleware/Middleware.js";
import { Sentinel } from "../reliability/sentinel.js";
import type { Trace } from "../reliability/types.js";
import type { Recorder } from "../reliability/recorder.js";
import { InMemoryStore } from "../memory/InMemoryStore.js";
import type { MemoryStore } from "../memory/MemoryStore.js";
import { Session } from "../memory/Session.js";
import { GuardrailManager } from "../guardrails/GuardrailManager.js";
import type { GuardrailConfig } from "../guardrails/types.js";
import { StructuredOutputError } from "../errors/SDKError.js";

export interface RunInput<T> {
  input: string;
  output: ZodType<T>;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function extractJSON(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = /```(?:json)?\s*([\s\S]*?)```/u.exec(trimmed);
    if (match !== null) {
      const inner = match[1];
      if (inner !== undefined) {
        return JSON.parse(inner.trim());
      }
    }
    throw new Error("No valid JSON found in response");
  }
}

export class Agent {
  private readonly middlewares: Middleware[] = [];
  private readonly _defaultStore: InMemoryStore = new InMemoryStore();
  private readonly _sessions = new Map<string, Session>();
  private _guardrailManager: GuardrailManager | undefined = undefined;
  private _handoffTarget: Agent | undefined = undefined;

  constructor(public readonly config: IAgentConfig) { }

  use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  guardrails(config: GuardrailConfig): this {
    this._guardrailManager = new GuardrailManager(config);
    return this;
  }

  handoff(target: Agent): this {
    this._handoffTarget = target;
    return this;
  }

  getHandoffTarget(): Agent | undefined {
    return this._handoffTarget;
  }

  session(sessionId: string, store?: MemoryStore): Session {
    const resolvedStore = store ?? this._defaultStore;
    resolvedStore.createSession(sessionId);

    const existing = this._sessions.get(sessionId);
    if (existing !== undefined) return existing;

    const newSession = new Session(sessionId, this, resolvedStore);
    this._sessions.set(sessionId, newSession);
    return newSession;
  }

  get memory(): MemoryStore {
    return this._defaultStore;
  }

  run(input: string): Promise<RunResult>;
  run<T>(options: RunInput<T>): Promise<RunResult & { data: T }>;
  async run<T = unknown>(
    input: string | RunInput<T>
  ): Promise<RunResult> {
    const isStructured = typeof input !== "string";
    const rawInput = isStructured ? input.input : input;
    const outputSchema: ZodType<T> | undefined = isStructured ? input.output : undefined;

    const effectiveInput = outputSchema !== undefined
      ? `${rawInput}\n\nIMPORTANT: Respond with ONLY valid JSON. No explanation, no markdown, no code blocks. Just raw JSON.`
      : rawInput;

    const recorder = Sentinel.createRecorder(this.config.name);
    const tracePlaceholder = {} as Trace;

    let actualInput = effectiveInput;
    if (this._guardrailManager !== undefined) {
      try {
        actualInput = await this._guardrailManager.applyInputGuardrails(effectiveInput, recorder);
      } catch (err) {
        recorder.record("run.failed", { agent: this.config.name, error: errMsg(err) });
        recorder.finish();
        throw err;
      }
    }

    recorder.record("run.started", { agent: this.config.name, input: rawInput });

    let result: RunResult;
    try {
      result = await this._pipeline(actualInput, recorder, tracePlaceholder, []);
    } catch (err) {
      recorder.record("run.failed", { agent: this.config.name, error: errMsg(err) });
      recorder.finish();
      throw err;
    }

    if (this._guardrailManager !== undefined) {
      try {
        const guardedOutput = await this._guardrailManager.applyOutputGuardrails(result.output, recorder);
        result = { ...result, output: guardedOutput };
      } catch (err) {
        recorder.record("run.failed", { agent: this.config.name, error: errMsg(err) });
        recorder.finish();
        throw err;
      }
    }

    if (outputSchema !== undefined) {
      result = await this._handleStructuredOutput(result, outputSchema, recorder);
    }

    recorder.record("run.completed", { agent: this.config.name });
    const trace = recorder.finish();
    Object.assign(tracePlaceholder, trace);
    result.trace = trace;

    return result;
  }

  async _runWithSession(
    input: string,
    priorMessages: IMessage[],
    store: MemoryStore,
    sessionId: string
  ): Promise<RunResult> {
    const recorder = Sentinel.createRecorder(this.config.name);
    const tracePlaceholder = {} as Trace;
    const isFirstRun = priorMessages.length === 0;

    recorder.record(isFirstRun ? "session.created" : "session.loaded", {
      sessionId,
      messageCount: priorMessages.length,
    });
    recorder.record("memory.loaded", { sessionId, count: priorMessages.length });

    let actualInput = input;
    if (this._guardrailManager !== undefined) {
      try {
        actualInput = await this._guardrailManager.applyInputGuardrails(input, recorder);
      } catch (err) {
        recorder.record("run.failed", { agent: this.config.name, error: errMsg(err) });
        recorder.finish();
        throw err;
      }
    }

    recorder.record("run.started", { agent: this.config.name, input: actualInput });

    let result: RunResult;
    try {
      result = await this._pipeline(actualInput, recorder, tracePlaceholder, priorMessages);
    } catch (err) {
      recorder.record("run.failed", { agent: this.config.name, error: errMsg(err) });
      recorder.finish();
      throw err;
    }

    if (this._guardrailManager !== undefined) {
      try {
        const guardedOutput = await this._guardrailManager.applyOutputGuardrails(result.output, recorder);
        result = { ...result, output: guardedOutput };
      } catch (err) {
        recorder.record("run.failed", { agent: this.config.name, error: errMsg(err) });
        recorder.finish();
        throw err;
      }
    }

    // Persist only the NEW turn messages (skip system + priorMessages)
    const newMessages = result.messages.slice(1 + priorMessages.length);
    store.appendMessages(sessionId, newMessages);
    recorder.record("memory.saved", { sessionId, count: newMessages.length });

    recorder.record("run.completed", { agent: this.config.name });
    const trace = recorder.finish();
    Object.assign(tracePlaceholder, trace);
    result.trace = trace;

    return result;
  }

  async _runWithHandoff(input: string, fromAgentName: string): Promise<RunResult> {
    const recorder = Sentinel.createRecorder(this.config.name);
    const tracePlaceholder = {} as Trace;

    recorder.record("handoff.started", { from: fromAgentName, to: this.config.name });

    let actualInput = input;
    if (this._guardrailManager !== undefined) {
      try {
        actualInput = await this._guardrailManager.applyInputGuardrails(input, recorder);
      } catch (err) {
        recorder.record("handoff.failed", { from: fromAgentName, to: this.config.name, error: errMsg(err) });
        recorder.record("run.failed", { agent: this.config.name, error: errMsg(err) });
        recorder.finish();
        throw err;
      }
    }

    recorder.record("run.started", { agent: this.config.name, input: actualInput });

    let result: RunResult;
    try {
      result = await this._pipeline(actualInput, recorder, tracePlaceholder, []);
    } catch (err) {
      recorder.record("handoff.failed", { from: fromAgentName, to: this.config.name, error: errMsg(err) });
      recorder.record("run.failed", { agent: this.config.name, error: errMsg(err) });
      recorder.finish();
      throw err;
    }

    if (this._guardrailManager !== undefined) {
      try {
        const guardedOutput = await this._guardrailManager.applyOutputGuardrails(result.output, recorder);
        result = { ...result, output: guardedOutput };
      } catch (err) {
        recorder.record("handoff.failed", { from: fromAgentName, to: this.config.name, error: errMsg(err) });
        recorder.record("run.failed", { agent: this.config.name, error: errMsg(err) });
        recorder.finish();
        throw err;
      }
    }

    recorder.record("handoff.completed", { from: fromAgentName, to: this.config.name });
    recorder.record("run.completed", { agent: this.config.name });
    const trace = recorder.finish();
    Object.assign(tracePlaceholder, trace);
    result.trace = trace;

    return result;
  }

  private async _pipeline(
    input: string,
    recorder: Recorder,
    tracePlaceholder: Trace,
    priorMessages: IMessage[]
  ): Promise<RunResult> {
    const context: RunContext = {
      config: this.config,
      input,
      messages: [],
      iteration: 0,
      metadata: {},
      recorder,
    };

    const runOpts = this._buildRunOptions(priorMessages);

    const kernel = (): Promise<RunResult> =>
      run(this.config, input, recorder, tracePlaceholder, runOpts).then((result) => {
        context.messages = result.messages;
        return result;
      });

    const pipeline = compose(this.middlewares);
    return pipeline(context, kernel);
  }

  private _buildRunOptions(priorMessages: IMessage[]) {
    type Opts = { priorMessages: IMessage[]; guardrailManager?: GuardrailManager };
    const opts: Opts = { priorMessages };
    if (this._guardrailManager !== undefined) {
      opts.guardrailManager = this._guardrailManager;
    }
    return opts;
  }

  private async _handleStructuredOutput<T>(
    result: RunResult,
    outputSchema: ZodType<T>,
    recorder: Recorder
  ): Promise<RunResult> {
    recorder.record("structured.validation", { attempt: 1 });

    let parsed: unknown;
    let validationPassed = false;

    try {
      parsed = extractJSON(result.output);
      const validation = outputSchema.safeParse(parsed);
      if (validation.success) {
        validationPassed = true;
        return { ...result, data: validation.data };
      }
    } catch {
      // JSON extraction failed — fall through to retry
    }

    recorder.record("structured.retry", {
      reason: "Initial response was not valid JSON or failed schema validation",
    });

    const retryMessages: IMessage[] = [
      ...result.messages,
      {
        role: "user",
        content: `
        Your previous response did not match the required schema.

        Return ONLY valid JSON matching this schema:

        ${JSON.stringify(outputSchema.toJSONSchema(), null, 2)}

        No markdown.
        No explanation.
        Only JSON.
        `,
      },
    ];

    try {
      const retryResponse = await this.config.provider.generate(retryMessages);
      const retryParsed = extractJSON(retryResponse.message.content);

      // console.log("First Response:", result.output);
      // console.log("Retry Response:", retryResponse.message.content);

      const retryValidation = outputSchema.safeParse(retryParsed);

      if (!retryValidation.success) {
        throw new StructuredOutputError(
          `Structured output validation failed after retry: ${retryValidation.error.message}`
        );
      }

      return { ...result, data: retryValidation.data };
    } catch (err) {
      if (err instanceof StructuredOutputError) throw err;
      throw new StructuredOutputError(`Failed to produce valid structured output: ${errMsg(err)}`);
    }
  }
}