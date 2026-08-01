import type { IMessage } from "../types/message.types.js";
import type { IProviderResponse } from "../types/provider.types.js";
import type { Tool } from "../types/tool.types.js";



export abstract class BaseProvider {
    abstract generate(
        messages: IMessage[],
        tools?: Tool[]
    ): Promise<IProviderResponse>
}