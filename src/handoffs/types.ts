import type { IMessage } from "../types/message.types.js";

export interface HandoffOptions {
  maxHandoffs?: number;
}

export interface HandoffContext {
  messages: IMessage[];
  input: string;
}
