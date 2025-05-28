import { OpenAIStream as VercelOpenAIStream, StreamingTextResponse as VercelStreamingTextResponse } from "ai"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function OpenAIStream(messages: any[], options: any = {}) {
  try {
    const response = await openai.chat.completions.create({
      model: options.model || "gpt-4",
      messages,
      stream: true,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      ...options,
    })

    return VercelOpenAIStream(response)
  } catch (error) {
    console.error("OpenAI Stream error:", error)
    throw error
  }
}

export { VercelStreamingTextResponse as StreamingTextResponse }

export default openai
