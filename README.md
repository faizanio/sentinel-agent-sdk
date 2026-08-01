# Sentinel AI Agent SDK

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![MIT](https://img.shields.io/badge/license-MIT-green)
![npm](https://img.shields.io/npm/v/@sentinel-ai-sdk/agent)
![Node](https://img.shields.io/badge/node-18+-brightgreen)

> A lightweight, composable TypeScript SDK for building AI agents with built-in middleware pipelines and deterministic execution tracing.

---

## Why Sentinel AI Agent SDK?

Many TypeScript agent frameworks abstract LLM interactions behind opaque abstractions, making it difficult to intercept control flow, debug tool failures, or track execution history in production.

Sentinel was built to address these challenges by prioritizing three core engineering principles:

- **Reliability**: Every agent step—from LLM invocation to tool execution and output processing—is tracked in a structured, immutable trace.
- **Observability**: Execution flows are inspectable in real time without requiring external telemetry vendor setups.
- **Composability**: Mid-flight requests are managed through a Koa-style middleware pipeline (`Loom`), enabling clean separation of concern for logging, timing, memory, and safety filters.

---

## Why choose Sentinel?

| Feature | Typical Agent SDKs | Sentinel AI Agent SDK |
|---|---|---|
| **Pipeline Control** | Fixed execution flow | Flexible middleware pipeline (`Loom`) |
| **Execution Observability** | Requires external OpenTelemetry | Built-in deterministic event tracing (`Sentinel`) |
| **State & Memory** | Tightly coupled to agent instance | Separated `Session` and `MemoryStore` models |
| **Safety** | Global or ad-hoc validation | Composable Input, Tool, and Output `Guardrails` |
| **Structured Data** | Raw JSON parsing | Zod validation with automatic single-retry fallback |
| **Multi-Agent** | Complex graph engines | Explicit `HandoffManager` delegation chains |
| **Architecture** | Heavy abstractions / dependencies | Lightweight, zero-dependency core runtime |
| **Type Safety** | Partial dynamic typing | End-to-end strongly typed TypeScript API |

---

## Architecture

```
User Input
    │
    ▼
Loom Middleware Pipeline
    │
    ▼
Input Guardrails
    │
    ▼
Agent Runtime Loop ◄──► Provider (OpenAI, etc.)
    │
    ▼
Tool Execution (Tool Guardrails)
    │
    ▼
Output Guardrails / Structured Output Validation
    │
    ▼
Sentinel Execution Trace & Result
```

---

## Features

- 🤖 **Agent Runtime**: Extensible runtime loop managing messages, tools, and provider interactions.
- 🧵 **Loom Middleware**: Pipeline architecture powered by a Koa-style composition engine (`compose()`).
- 🛡️ **Sentinel Reliability**: Event-based tracing for complete execution auditing (`Trace`).
- 🧠 **Memory & Sessions**: Stateful session isolation using `Session` and `MemoryStore`.
- 🚧 **Guardrails**: Intercept, inspect, modify, or reject inputs, tool invocations, and outputs.
- 🤝 **Agent Handoffs**: Multi-agent delegation with cycle protection.
- 🎯 **Structured Output**: Typed Zod schema validation with automatic retry recovery.

---

## Installation

```bash
npm install @sentinel-ai-sdk/agent
```

> **Note**: `zod`, `openai`, and `dotenv` are included in package dependencies. Install `zod` separately only if you define custom schemas directly in your application code:
> ```bash
> npm install zod
> ```

---

## Quick Start

```ts
import 'dotenv/config';
import { z } from 'zod';
import { Agent, OpenAIProvider, tool } from '@sentinel-ai-sdk/agent';

const weatherTool = tool({
  name: 'get_weather',
  description: 'Get weather report for a city',
  schema: z.object({ city: z.string() }),
  async execute({ city }) {
    return { city, temperature: '24°C', condition: 'Sunny' };
  },
});

const agent = new Agent({
  name: 'WeatherAssistant',
  instructions: 'You are a helpful weather assistant.',
  provider: new OpenAIProvider({
    apikey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o-mini',
  }),
  tools: [weatherTool],
});

const result = await agent.run("What's the weather in Tokyo?");
console.log(result.output);
console.log(result.trace.events);
```

---

## Tools

Define strongly typed tools with Zod schemas for input validation:

```ts
import { tool } from '@sentinel-ai-sdk/agent';
import { z } from 'zod';

const calculator = tool({
  name: 'calculator',
  description: 'Perform arithmetic operations',
  schema: z.object({
    a: z.number(),
    b: z.number(),
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
  }),
  async execute({ a, b, operation }) {
    switch (operation) {
      case 'add': return a + b;
      case 'subtract': return a - b;
      case 'multiply': return a * b;
      case 'divide': return a / b;
    }
  },
});
```

---

## Memory & Sessions

Isolate conversation history per session without altering agent configuration:

```ts
const session = agent.session('user-session-101');

const r1 = await session.run('My name is Alice.');
console.log(r1.output);

const r2 = await session.run('What is my name?');
console.log(r2.output); // "Your name is Alice."
```

Custom stores can be provided by implementing the `MemoryStore` interface:

```ts
import { InMemoryStore } from '@sentinel-ai-sdk/agent';

const store = new InMemoryStore();
const session = agent.session('custom-session', store);
```

---

## Guardrails

Intercept and validate execution at three distinct stages:

```ts
agent.guardrails({
  input: [
    async (input) => {
      if (input.includes('restricted')) {
        return { allowed: false, reason: 'Restricted content' };
      }
      return { allowed: true };
    },
  ],
  tool: [
    async (toolName, args) => {
      if (toolName === 'delete_user') {
        return { allowed: false, reason: 'Destructive tool blocked' };
      }
      return { allowed: true };
    },
  ],
  output: [
    async (output) => output.trim(),
  ],
});
```

---

## Structured Output

Request validated JSON responses against a Zod schema. If parsing fails, Sentinel issues an automatic single-retry attempt:

```ts
import { z } from 'zod';

const result = await agent.run({
  input: 'Generate a user profile for a software engineer.',
  output: z.object({
    name: z.string(),
    role: z.string(),
    yearsExperience: z.number(),
  }),
});

console.log(result.data.name); // Fully typed object
```

---

## Handoffs

Orchestrate agent delegation chains using `HandoffManager`:

```ts
import { Agent, HandoffManager, OpenAIProvider } from '@sentinel-ai-sdk/agent';

const provider = new OpenAIProvider({ apikey: process.env.OPENAI_API_KEY! });

const planner = new Agent({ name: 'Planner', instructions: 'Plan task steps.', provider });
const writer = new Agent({ name: 'Writer', instructions: 'Draft response.', provider });

planner.handoff(writer);

const result = await HandoffManager.run(planner, 'Outline and write a guide on TypeScript.');
console.log(result.output);
```

---

## Loom Middleware

Loom provides Koa-style middleware composition around the agent runtime loop:

```ts
import { loggingMiddleware, timingMiddleware } from '@sentinel-ai-sdk/agent';

agent.use(loggingMiddleware());
agent.use(timingMiddleware());

// Custom middleware
agent.use(async (context, next) => {
  const start = Date.now();
  const result = await next();
  context.metadata['customTiming'] = Date.now() - start;
  return result;
});
```

---

## Sentinel Tracing

Every agent invocation records structured events (`run.*`, `llm.*`, `tool.*`, `guardrail.*`, `session.*`, `handoff.*`) in a sealed `Trace` object:

```ts
import { Sentinel } from '@sentinel-ai-sdk/agent';

const result = await agent.run('Hello');

// Access trace directly from RunResult
console.log(result.trace.duration);
console.log(result.trace.events);

// Access process-level trace registry
const allTraces = Sentinel.listTraces();
const trace = Sentinel.getTrace(result.trace.id);
```

---

## Design Principles

- **Composable over Monolithic**: Small, single-purpose abstractions (middleware, guardrails, stores) composed together.
- **Reliability First**: Every state mutation and LLM turn generates an immutable trace event.
- **Type-Safe APIs**: Strict TypeScript interfaces with zero use of `any`.
- **Framework-Independent Runtime**: Core agent loop remains lean without external runtime dependencies.
- **Developer Experience**: Intuitive APIs requiring minimal boilerplate.
- **Explicit Execution Flow**: Control flow decisions are visible and editable via middleware and guardrails.

---

## Examples

Runnable example scripts are available in [`src/examples/basic.ts`](./src/examples/basic.ts).

Run locally:
```bash
npx tsx src/examples/basic.ts
```

---

## API Reference

### `Agent`
Primary class for defining and executing agent runtimes.
- `new Agent(config: IAgentConfig)`: Initializes an Agent.
- `use(middleware: Middleware): this`: Registers a Loom middleware.
- `guardrails(config: GuardrailConfig): this`: Attaches guardrails.
- `handoff(target: Agent): this`: Sets handoff target agent.
- `session(sessionId: string, store?: MemoryStore): Session`: Creates or retrieves a session.
- `run(input: string | RunInput<T>): Promise<RunResult>`: Executes an agent run.

### `tool()`
Factory function for creating validated tools.
- `tool(config: Tool<TSchema>): Tool<TSchema>`: Creates a tool instance.

### `OpenAIProvider`
LLM provider implementation for OpenAI models.
- `new OpenAIProvider(config: { apikey: string; model?: string })`: Initializes OpenAI provider.

### `Sentinel`
Process-wide registry for managing execution traces.
- `Sentinel.getTrace(id: string): Trace | undefined`: Retrieves a trace by ID.
- `Sentinel.listTraces(): Trace[]`: Returns all recorded traces.
- `Sentinel.clear(): void`: Clears the trace registry.

### `HandoffManager`
Orchestrator for managing multi-agent delegation chains.
- `HandoffManager.run(startAgent: Agent, input: string, options?: HandoffOptions): Promise<RunResult>`: Executes a handoff chain until completion or max limit.
- `HandoffManager.handoff(from: Agent, to: Agent, input: string): Promise<RunResult>`: Performs an explicit single-agent handoff.

---

## Roadmap

- [x] Phase 1: Core Runtime & OpenAI Provider
- [x] Phase 2: Loom Middleware Pipeline
- [x] Phase 3: Sentinel Execution Tracing
- [x] Phase 4: Memory, Guardrails, Handoffs & Structured Output
- [ ] Phase 5: Additional LLM Providers (Anthropic, Gemini)
- [ ] Phase 6: Persistent Storage Adapters (Redis, Postgres)

---

## License

[MIT License](./LICENSE) © 2026 Sentinel AI
