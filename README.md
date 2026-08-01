# @sentinel-ai/agent

An open-source TypeScript AI Agent SDK with Loom middleware pipeline and Sentinel deterministic reliability execution tracing.

## Features

- 🤖 **Agent Core**: Provider-agnostic agent runtime loop with first-class tool calling & Zod validation.
- 🧵 **Loom Middleware**: Koa-style middleware pipeline for logging, timing, and custom context mutation.
- 🛡️ **Sentinel Reliability**: Deterministic execution tracing for debugging, auditing, and replaying agent steps.
- 🧠 **Memory & Sessions**: Conversation persistence per session ID with state isolation.
- 🚧 **Guardrails**: Composable input, tool, and output validation filters.
- 🤝 **Handoffs**: Multi-agent delegation chains with loop prevention.
- 🎯 **Structured Output**: Typed Zod schema responses with automatic single-retry fallback.

## Installation

```bash
npm install @sentinel-ai/agent zod
```

## Quick Start

```ts
import { Agent, OpenAIProvider, tool } from "@sentinel-ai/agent";
import { z } from "zod";

const weatherTool = tool({
  name: "get_weather",
  description: "Get the current weather for a city",
  schema: z.object({ city: z.string() }),
  async execute({ city }) {
    return { city, temperature: "22°C", condition: "Sunny" };
  },
});

const agent = new Agent({
  name: "WeatherAssistant",
  instructions: "You are a helpful AI weather assistant.",
  provider: new OpenAIProvider({
    apikey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o-mini",
  }),
  tools: [weatherTool],
});

const result = await agent.run("What's the weather in Tokyo?");
console.log(result.output);
console.log(result.trace); // Sentinel trace
```

## Middleware (Loom)

```ts
import { agent, loggingMiddleware, timingMiddleware } from "@sentinel-ai/agent";

agent.use(loggingMiddleware());
agent.use(timingMiddleware());
```

## Reliability (Sentinel)

```ts
import { Sentinel } from "@sentinel-ai/agent";

const traces = Sentinel.listTraces();
console.log(traces);
```

## License

MIT
# sentinel-agent-sdk
