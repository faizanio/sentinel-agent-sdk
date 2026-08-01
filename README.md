# Sentinel AI Agent SDK

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![MIT](https://img.shields.io/badge/license-MIT-green)
![npm](https://img.shields.io/npm/v/@sentinel-ai/agent)
![Node](https://img.shields.io/badge/node-18+-brightgreen)

> **Sentinel** is an open-source, production-ready TypeScript AI Agent SDK built with a composable middleware pipeline (**Loom**) and deterministic execution tracing (**Sentinel**).

---

## 🌟 Hero

Traditional LLM wrappers hide execution state, making agent debugging unpredictable. **Sentinel** treats agent execution as a deterministic pipeline. With **Loom** middleware and **Sentinel** execution tracing, developers get end-to-end visibility, session memory management, composable guardrails, multi-agent handoffs, and strongly-typed structured outputs.

---

## ✨ Features

- 🤖 **Agent Runtime**: Extensible execution loop supporting providers, instructions, and tools.
- 🧵 **Loom Middleware**: Pipeline architecture powered by a Koa-style composition engine (`compose()`).
- 🛡️ **Sentinel Reliability**: Automatic, zero-config event recording (`Trace`) for full execution observability.
- 🧠 **Memory & Sessions**: Built-in stateful session memory management (`Session`, `InMemoryStore`).
- 🚧 **Guardrails**: Intercept, validate, modify, or reject inputs, tool executions, and outputs.
- 🤝 **Agent Handoffs**: Multi-agent orchestration and delegation with cycle protection.
- 🎯 **Structured Output**: Strictly typed Zod schema parsing with single-retry error recovery.

---

## 📦 Installation

To install the SDK, run:

```bash
npm install @sentinel-ai/agent
```

> **Note on Dependencies**: `dotenv`, `openai`, and `zod` are included as package dependencies and will be installed automatically by `npm`. You do not need to install them separately unless you wish to import `zod` directly in your application code for defining schemas:
> ```bash
> npm install zod
> ```

---

## 🚀 Quick Start

```ts
import 'dotenv/config';
import { z } from 'zod';
import { Agent, OpenAIProvider, tool } from '@sentinel-ai/agent';

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
console.log('Execution Trace:', result.trace);
```

---

## 🛠️ Tools

Tools are strongly typed functions that agents can invoke using Zod schemas for input validation:

```ts
import { tool } from '@sentinel-ai/agent';
import { z } from 'zod';

const calculatorTool = tool({
  name: 'calculator',
  description: 'Perform basic math calculations',
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

## 🧠 Memory

Sentinel provides a modular `MemoryStore` abstraction. The default `InMemoryStore` manages session message histories in memory:

```ts
import { InMemoryStore } from '@sentinel-ai/agent';

const memory = new InMemoryStore();
memory.createSession('user-101');
```

---

## 💬 Sessions

Sessions isolate state across interactions by automatically persisting conversation history:

```ts
const session = agent.session('chat-session-1');

const reply1 = await session.run('Hi, my name is Alice.');
console.log(reply1.output);

const reply2 = await session.run('What is my name?');
console.log(reply2.output); // "Your name is Alice."
```

---

## 🚧 Guardrails

Guardrails allow developers to filter or transform inputs, tool calls, and outputs:

```ts
agent.guardrails({
  input: [
    async (input) => {
      if (input.includes('hack')) {
        return { allowed: false, reason: 'Disallowed keyword detected' };
      }
      return { allowed: true };
    },
  ],
  output: [
    async (output) => {
      return output.trim();
    },
  ],
});
```

---

## 🎯 Structured Output

Force agents to respond with validated Zod schemas. If initial JSON parsing fails, Sentinel performs a single automatic retry:

```ts
const result = await agent.run({
  input: 'Generate a fictional software engineer profile.',
  output: z.object({
    name: z.string(),
    role: z.string(),
    yearsExperience: z.number(),
    skills: z.array(z.string()),
  }),
});

console.log(result.data.name); // Strongly typed!
```

---

## 🤝 Handoffs

Coordinate multi-agent delegation chains using `HandoffManager`:

```ts
import { Agent, HandoffManager, OpenAIProvider } from '@sentinel-ai/agent';

const provider = new OpenAIProvider({ apikey: process.env.OPENAI_API_KEY! });

const planner = new Agent({ name: 'Planner', instructions: 'Break down complex requests.', provider });
const writer = new Agent({ name: 'Writer', instructions: 'Draft content.', provider });

planner.handoff(writer);

const result = await HandoffManager.run(planner, 'Write an article on quantum computing.');
console.log(result.output);
```

---

## 🧵 Loom Middleware

Loom provides Koa-style middleware composition around the agent runtime loop:

```ts
import { loggingMiddleware, timingMiddleware } from '@sentinel-ai/agent';

agent.use(loggingMiddleware());
agent.use(timingMiddleware());

// Custom Middleware
agent.use(async (ctx, next) => {
  console.log('Before execution context:', ctx.input);
  const result = await next();
  console.log('After execution context:', result.output);
  return result;
});
```

---

## 🛡️ Sentinel Tracing

Every agent run generates an immutable execution `Trace` containing all lifecycle events (`run.*`, `llm.*`, `tool.*`, `guardrail.*`, `session.*`, `handoff.*`):

```ts
import { Sentinel } from '@sentinel-ai/agent';

const result = await agent.run('Hello agent');

// Access trace from result
console.log(result.trace.events);

// Access global trace registry
const allTraces = Sentinel.listTraces();
const singleTrace = Sentinel.getTrace(result.trace.id);
```

---

## 💡 Examples

Complete executable example scripts are located in [`src/examples/basic.ts`](file:///Users/faizee/Developer/AI%20Engineering/sentinel-agent-sdk/src/examples/basic.ts).

To run locally:
```bash
npx tsx src/examples/basic.ts
```

---

## 📖 API Reference

### `Agent`
- `new Agent(config: IAgentConfig)`
- `agent.use(middleware: Middleware)`: Register Loom middleware.
- `agent.guardrails(config: GuardrailConfig)`: Attach guardrails.
- `agent.handoff(targetAgent: Agent)`: Target agent for handoff.
- `agent.session(sessionId: string)`: Create or load a Session.
- `agent.run(input: string | RunInput<T>)`: Execute agent run.

### `Sentinel`
- `Sentinel.getTrace(id: string)`: Retrieve trace by ID.
- `Sentinel.listTraces()`: List recorded traces.
- `Sentinel.clear()`: Clear recorded traces.

---

## 🗺️ Roadmap

- [x] Phase 1: Core Runtime & OpenAI Provider
- [x] Phase 2: Loom Middleware Pipeline
- [x] Phase 3: Sentinel Execution Tracing
- [x] Phase 4: Memory, Guardrails, Handoffs & Structured Output
- [ ] Phase 5: Additional LLM Providers (Anthropic, Gemini)
- [ ] Phase 6: Persistent File/Database Memory Stores

---

## 🏷️ Topics

`typescript` `ai` `agent` `llm` `openai` `sdk` `middleware` `tracing` `guardrails` `memory`

---

## 📄 License

[MIT License](file:///Users/faizee/Developer/AI%20Engineering/sentinel-agent-sdk/LICENSE) © 2026 Sentinel AI
