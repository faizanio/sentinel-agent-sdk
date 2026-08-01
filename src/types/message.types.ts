import type { ToolCall } from "./provider.types.js";


export type TRole = "system" | "user" | "assistant" | "tool"

export interface IMessage {
    role: TRole;
    content: string;

    toolCallId?: string;
    toolName?: string

    toolCalls?: ToolCall[]
}