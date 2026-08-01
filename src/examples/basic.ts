import 'dotenv/config'

import { z } from 'zod'
import { Agent, HandoffManager, OpenAIProvider, Sentinel, tool } from '../index.js'


const weather = tool({
    name: 'weather',

    description: 'get weather report',

    schema: z.object({
        city: z.string()
    }),

    async execute({ city }) {
        console.log("🛠 Weather tool executed:", city);
        return {
            city,
            temperature: '30C',
            condition: 'rainy'
        }
    }
})

const agent = new Agent({
    name: 'Assistant',

    instructions: 'You are a helpul AI assistant',

    provider: new OpenAIProvider({
        apikey: process.env.OPENAI_API_KEY!,
        model: 'gpt-4o-mini'
    }),

    tools: [weather]
})