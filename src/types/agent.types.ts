import type { IProvider } from "./provider.types.js";
import type { Tool } from "./tool.types.js";


export interface IAgentConfig {
    name: string;
    instructions: string;

    provider: IProvider;

    tools?: Tool[];

    maxInterations?: number
}