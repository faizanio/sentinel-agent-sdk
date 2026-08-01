export interface GuardrailResult {
  action?: "allow" | "modify" | "reject";
  allowed?: boolean;
  modified?: string;
  input?: string;
  reason?: string;
}

export type InputGuardrail = (
  input: string
) => GuardrailResult | string | Promise<GuardrailResult | string>;

export type ToolGuardrail = (
  toolName: string,
  args: Record<string, unknown>
) => GuardrailResult | Record<string, unknown> | Promise<GuardrailResult | Record<string, unknown>>;

export type OutputGuardrail = (
  output: string
) => GuardrailResult | string | Promise<GuardrailResult | string>;

export interface GuardrailConfig {
  input?: InputGuardrail[];
  tool?: ToolGuardrail[];
  output?: OutputGuardrail[];
}


