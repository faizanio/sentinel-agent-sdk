import type { ZodType } from "zod"
import type {Tool} from '../types/tool.types.js'


export function tool<TSchema extends ZodType>(
    config: Tool<TSchema>
): Tool<TSchema> {
    return config
}