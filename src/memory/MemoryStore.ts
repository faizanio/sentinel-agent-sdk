import type { IMessage } from "../types/message.types.js";

export interface MemoryStore {
  createSession(id: string): void;
  getMessages(id: string): IMessage[];
  appendMessages(id: string, messages: IMessage[]): void;
  clearSession(id: string): void;
  listSessions(): string[];
}
