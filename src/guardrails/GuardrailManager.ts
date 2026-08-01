import { GuardrailRejectionError } from "../errors/SDKError.js";
import type { Recorder } from "../reliability/recorder.js";
import type { GuardrailConfig, GuardrailResult } from "./types.js";

export class GuardrailManager {
  constructor(private readonly config: GuardrailConfig) {}

  private isRejected(result: unknown): boolean {
    if (typeof result === "object" && result !== null) {
      const res = result as GuardrailResult;
      if (res.action === "reject") return true;
      if (res.allowed === false) return true;
    }
    return false;
  }

  private getAction(result: unknown, original: unknown): "allow" | "modify" | "reject" {
    if (this.isRejected(result)) return "reject";

    if (typeof result === "string" && typeof original === "string") {
      return result !== original ? "modify" : "allow";
    }

    if (typeof result === "object" && result !== null) {
      const res = result as GuardrailResult;
      if (res.action === "modify" || res.modified !== undefined || res.input !== undefined) {
        return "modify";
      }
    }

    return "allow";
  }

  async applyInputGuardrails(input: string, recorder: Recorder): Promise<string> {
    let current = input;
    for (const guardrail of this.config.input ?? []) {
      try {
        const result = await guardrail(current);
        const action = this.getAction(result, current);
        const reason = typeof result === "object" && result !== null ? (result as GuardrailResult).reason ?? "" : "";

        recorder.record("guardrail.input", { action, reason });

        if (this.isRejected(result)) {
          throw new GuardrailRejectionError(reason || "Input rejected by guardrail");
        }

        if (typeof result === "string") {
          current = result;
        } else if (typeof result === "object" && result !== null) {
          const newContent = (result as GuardrailResult).modified ?? (result as GuardrailResult).input;
          if (newContent !== undefined) {
            current = newContent;
          }
        }
      } catch (err) {
        if (err instanceof GuardrailRejectionError) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        recorder.record("guardrail.input", { action: "reject", reason: msg });
        throw new GuardrailRejectionError(msg);
      }
    }
    return current;
  }

  async applyToolGuardrails(
    toolName: string,
    args: Record<string, unknown>,
    recorder: Recorder
  ): Promise<Record<string, unknown>> {
    let currentArgs = args;
    for (const guardrail of this.config.tool ?? []) {
      try {
        const result = await guardrail(toolName, currentArgs);
        const action = this.getAction(result, currentArgs);
        const reason = typeof result === "object" && result !== null ? (result as GuardrailResult).reason ?? "" : "";

        recorder.record("guardrail.tool", {
          tool: toolName,
          action,
          reason,
        });

        if (this.isRejected(result)) {
          throw new GuardrailRejectionError(
            reason || `Tool '${toolName}' rejected by guardrail`
          );
        }

        if (typeof result === "object" && result !== null) {
          const res = result as GuardrailResult;
          if (res.action !== undefined || res.allowed !== undefined || res.modified !== undefined || res.reason !== undefined) {
            // It's a GuardrailResult object
          } else {
            // It's a modified args object
            currentArgs = result as Record<string, unknown>;
          }
        }
      } catch (err) {
        if (err instanceof GuardrailRejectionError) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        recorder.record("guardrail.tool", { tool: toolName, action: "reject", reason: msg });
        throw new GuardrailRejectionError(msg);
      }
    }
    return currentArgs;
  }

  async applyOutputGuardrails(output: string, recorder: Recorder): Promise<string> {
    let current = output;
    for (const guardrail of this.config.output ?? []) {
      try {
        const result = await guardrail(current);
        const action = this.getAction(result, current);
        const reason = typeof result === "object" && result !== null ? (result as GuardrailResult).reason ?? "" : "";

        recorder.record("guardrail.output", { action, reason });

        if (this.isRejected(result)) {
          throw new GuardrailRejectionError(reason || "Output rejected by guardrail");
        }

        if (typeof result === "string") {
          current = result;
        } else if (typeof result === "object" && result !== null) {
          const newContent = (result as GuardrailResult).modified ?? (result as GuardrailResult).input;
          if (newContent !== undefined) {
            current = newContent;
          }
        }
      } catch (err) {
        if (err instanceof GuardrailRejectionError) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        recorder.record("guardrail.output", { action: "reject", reason: msg });
        throw new GuardrailRejectionError(msg);
      }
    }
    return current;
  }
}


