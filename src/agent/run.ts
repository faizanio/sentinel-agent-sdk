import { MaxIterationsError } from "../errors/SDKError.js";
import { executeTool } from "../tools/executeTool.js";
import type { IAgentConfig } from "../types/agent.types.js";
import type { IMessage } from "../types/message.types.js";
import type { RunResult } from "../types/result.types.js";
import type { Recorder } from "../reliability/recorder.js";
import type { Trace } from "../reliability/types.js";
import type { GuardrailManager } from "../guardrails/GuardrailManager.js";

export interface RunOptions {
  priorMessages?: IMessage[];
  guardrailManager?: GuardrailManager;
}

export async function run(
  config: IAgentConfig,
  input: string,
  recorder: Recorder,
  trace: Trace,
  options?: RunOptions
): Promise<RunResult> {
  const messages: IMessage[] = [
    { role: "system", content: config.instructions },
    ...(options?.priorMessages ?? []),
    { role: "user", content: input },
  ];

  const maxIterations = config.maxInterations ?? 10;

  for (let i = 0; i < maxIterations; i++) {
    recorder.record("llm.started", { iteration: i });

    const response = await config.provider.generate(messages, config.tools);

    recorder.record("llm.completed", {
      iteration: i,
      hasToolCalls: Boolean(response.toolCalls?.length),
    });

    messages.push(response.message);

    const toolCalls = response.toolCalls;
    if (!toolCalls?.length) {
      return {
        output: response.message.content,
        messages,
        trace,
      };
    }

    for (const toolCall of toolCalls) {
      const tool = config.tools?.find((t) => t.name === toolCall.name);

      if (!tool) {
        throw new Error(`Tool ${toolCall.name} not found`);
      }

      const parsedArgs = JSON.parse(toolCall.arguments) as Record<string, unknown>;

      if (options?.guardrailManager !== undefined) {
        await options.guardrailManager.applyToolGuardrails(toolCall.name, parsedArgs, recorder);
      }

      recorder.record("tool.started", { tool: toolCall.name, iteration: i });

      try {
        const result = await executeTool(tool, parsedArgs);

        recorder.record("tool.completed", { tool: toolCall.name, iteration: i });

        messages.push({
          role: "tool",
          toolCallId: toolCall.id,
          toolName: tool.name,
          content: JSON.stringify(result),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        recorder.record("tool.failed", { tool: toolCall.name, iteration: i, error: message });
        throw err;
      }
    }
  }

  throw new MaxIterationsError(maxIterations);
}