import type { IMessage } from "./message.types.js";
import type { Trace } from "../reliability/types.js";

export interface RunResult {
  output: string;
  messages: IMessage[];
  trace: Trace;
  data?: unknown;
}