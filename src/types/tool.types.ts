import type { z, ZodType } from "zod";



export interface Tool<TSchema extends ZodType = ZodType> {
    name: string;
    description: string;
    schema: TSchema;

    execute(
        input: z.infer<TSchema>
    ): Promise<unknown>
}