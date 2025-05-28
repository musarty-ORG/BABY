import OpenAI from "openai"
import { OpenAIStream as VercelOpenAIStream, StreamingTextResponse } from "ai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function OpenAIStream(response: Response, options: any = {}) {
  try {
    return VercelOpenAIStream(response)
  } catch (error) {
    console.error("OpenAI Stream error:", error)
    throw error
  }
}

export { StreamingTextResponse }

export default openai
