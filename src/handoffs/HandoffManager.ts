import type { Agent } from "../agent/Agent.js";
import type { RunResult } from "../types/result.types.js";
import { HandoffError } from "../errors/SDKError.js";
import type { HandoffOptions } from "./types.js";

export class HandoffManager {
  static async run(
    startAgent: Agent,
    input: string,
    options: HandoffOptions = {}
  ): Promise<RunResult> {
    const maxHandoffs = options.maxHandoffs ?? 5;
    let currentAgent: Agent = startAgent;
    let currentInput: string = input;
    let result: RunResult | undefined;
    let prevAgentName: string | undefined;
    let handoffCount = 0;

    while (true) {
      if (prevAgentName !== undefined) {
        result = await currentAgent._runWithHandoff(currentInput, prevAgentName);
      } else {
        result = await currentAgent.run(currentInput);
      }

      const nextAgent = currentAgent.getHandoffTarget();
      if (nextAgent === undefined) break;

      if (handoffCount >= maxHandoffs) {
        throw new HandoffError(`Maximum handoff limit (${maxHandoffs}) reached`);
      }

      prevAgentName = currentAgent.config.name;
      currentInput = result.output;
      currentAgent = nextAgent;
      handoffCount++;
    }

    if (result === undefined) {
      throw new HandoffError("Handoff chain produced no result");
    }

    return result;
  }

  static async handoff(from: Agent, to: Agent, input: string): Promise<RunResult> {
    return to._runWithHandoff(input, from.config.name);
  }
}
