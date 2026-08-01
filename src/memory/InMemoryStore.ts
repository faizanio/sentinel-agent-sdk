import type { IMessage } from "../types/message.types.js";
import type { MemoryStore } from "./MemoryStore.js";

export class InMemoryStore implements MemoryStore {
  private readonly sessions = new Map<string, IMessage[]>();

  createSession(id: string): void {
    if (!this.sessions.has(id)) {
      this.sessions.set(id, []);
    }
  }

  getMessages(id: string): IMessage[] {
    return [...(this.sessions.get(id) ?? [])];
  }

  appendMessages(id: string, messages: IMessage[]): void {
    const existing = this.sessions.get(id) ?? [];
    this.sessions.set(id, [...existing, ...messages]);
  }

  clearSession(id: string): void {
    this.sessions.set(id, []);
  }

  listSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}
