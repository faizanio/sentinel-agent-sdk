import type { IMessage } from "./message.types.js";


export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface IProviderResponse {
    message: IMessage;

    toolCalls?: ToolCall[];
}

export interface IProvider {
    generate(
        messages: IMessage[],
        tools?: unknown[]
    ): Promise<IProviderResponse>
}