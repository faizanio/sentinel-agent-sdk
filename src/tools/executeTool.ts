import { ToolExecutionError } from "../errors/SDKError.js";
import type { Tool } from "../types/tool.types.js";


export async function executeTool(tool: Tool, input: unknown){
    const parsed = tool.schema.safeParse(input)

    if(!parsed.success){
        throw new ToolExecutionError(parsed.error.message)
    }

    try {
        await tool.execute(parsed.data)
    } catch (error) {
        throw new ToolExecutionError(
            error instanceof Error ? error.message: "Tool execution failed"
        )
    }
}