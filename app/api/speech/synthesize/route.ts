import type { NextRequest } from "next/server"
import { Groq } from "groq-sdk"

let groq: Groq | null = null

function getGroq() {
  if (!groq && process.env.GROQ_API_KEY) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return groq
}

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const groqClient = getGroq()
    if (!groqClient) {
      return Response.json({ error: "Speech synthesis service temporarily unavailable" }, { status: 503 })
    }

    const body = await req.json()
    const { text, voice = "Cheyenne-PlayAI", format = "mp3" } = body

    if (!text || typeof text !== "string") {
      return Response.json({ error: "Text is required and must be a string" }, { status: 400 })
    }

    // Validate voice option
    const validVoices = ["Cheyenne-PlayAI", "Basil-PlayAI", "Celeste-PlayAI", "Thunder-PlayAI"]
    if (!validVoices.includes(voice)) {
      return Response.json({ error: "Invalid voice option" }, { status: 400 })
    }

    // Synthesize speech using GROQ PlayAI
    const response = await groq.audio.speech.create({
      model: "playai-tts",
      voice: voice as any,
      input: text,
      response_format: format as "mp3" | "wav",
    })

    const audioBuffer = await response.arrayBuffer()

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": `audio/${format}`,
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("Speech synthesis error:", error)
    return Response.json(
      {
        error: "Speech synthesis failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
