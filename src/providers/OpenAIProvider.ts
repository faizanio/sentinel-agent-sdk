import OpenAI from "openai";
import { z } from "zod";
import type {
    ChatCompletionCreateParamsNonStreaming,
    ChatCompletionFunctionTool,
    ChatCompletionMessageParam,
    ChatCompletionMessageToolCall,
    ChatCompletionTool,
} from "openai/resources/chat/completions/completions.js";

import { BaseProvider } from "./Provider.js";
import type { IMessage } from "../types/message.types.js";
import type { IProviderResponse } from "../types/provider.types.js";
import type { Tool } from "../types/tool.types.js";

export interface OpenAIProviderOptions {
    apikey: string;
    model: string;
}

export class OpenAIProvider extends BaseProvider {
    private client: OpenAI;

    constructor(private options: OpenAIProviderOptions) {
        super();

        this.client = new OpenAI({
            apiKey: options.apikey,
        });
    }

    async generate(messages: IMessage[], tools?: Tool[]): Promise<IProviderResponse> {
        const requestBody: ChatCompletionCreateParamsNonStreaming = {
            model: this.options.model,
            messages: messages.map((message) => this.mapMessage(message)),
            ...(tools && tools.length > 0 ? {
                tools: tools.map((tool) => this.mapTool(tool)),
            } : {}),
        };

        const response = await this.client.chat.completions.create(requestBody);

        const assistant = response.choices[0]?.message;
        const toolCalls = assistant?.tool_calls?.flatMap((call) => {
            if (call.type !== "function") {
                return [];
            }

            return [{
                id: call.id,
                name: call.function.name,
                arguments: call.function.arguments,
            }];
        });

        const providerResponse: IProviderResponse = {
            message: {
                role: "assistant",
                content: typeof assistant?.content === "string" ? assistant.content : "",
                ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : {}),
            },
        };

        if (toolCalls && toolCalls.length > 0) {
            providerResponse.toolCalls = toolCalls;
        }

        return providerResponse;
    }

    private mapMessage(message: IMessage): ChatCompletionMessageParam {
        const content = message.content ?? "";

        if (message.role === "tool") {
            return {
                role: "tool",
                content,
                tool_call_id: message.toolCallId ?? "",
            };
        }

        if (message.role === "assistant" && message.toolCalls?.length) {
            const toolCalls: ChatCompletionMessageToolCall[] = message.toolCalls.map((call) => ({
                id: call.id,
                type: "function",
                function: {
                    name: call.name,
                    arguments: call.arguments,
                },
            }));

            return {
                role: "assistant",
                content,
                tool_calls: toolCalls,
            };
        }

        return {
            role: message.role,
            content,
        };
    }

    private mapTool(tool: Tool): ChatCompletionTool {
        const functionTool: ChatCompletionFunctionTool = {
            type: "function",
            function: {
                name: tool.name,
                description: tool.description,
                parameters: this.toJsonSchema(tool.schema),
            },
        };

        return functionTool;
    }

    private toJsonSchema(schema: Tool["schema"]): Record<string, unknown> {
        const schemaWithJsonMethod = schema as Tool["schema"] & { toJSONSchema?: (...args: unknown[]) => unknown };

        if (typeof schemaWithJsonMethod.toJSONSchema === "function") {
            const jsonSchema = schemaWithJsonMethod.toJSONSchema();
            if (jsonSchema && typeof jsonSchema === "object") {
                return jsonSchema as Record<string, unknown>;
            }
        }

        return z.toJSONSchema(schema) as Record<string, unknown>;
    }
}