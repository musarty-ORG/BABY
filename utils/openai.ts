import { createOpenAI } from "@ai-sdk/openai"
import { streamText } from "ai"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function OpenAIStream(messages: any[], model = "gpt-4o-mini", temperature = 0.7) {
  try {
    const result = await streamText({
      model: openai(model),
      messages,
      temperature,
      maxTokens: 4000,
    })

    return result.toAIStream()
  } catch (error) {
    console.error("OpenAI Stream error:", error)
    throw error
  }
}

export class StreamingTextResponse extends Response {
  constructor(stream: ReadableStream, init?: ResponseInit) {
    super(stream, {
      ...init,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...init?.headers,
      },
    })
  }
}

export async function generateCompletion(prompt: string, model = "gpt-4o-mini", maxTokens = 1000) {
  try {
    const result = await streamText({
      model: openai(model),
      prompt,
      maxTokens,
      temperature: 0.7,
    })

    return result
  } catch (error) {
    console.error("Generate completion error:", error)
    throw error
  }
}

export function createStreamResponse(stream: ReadableStream) {
  return new StreamingTextResponse(stream)
}
