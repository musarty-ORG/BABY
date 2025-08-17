import type { NextRequest } from "next/server"
import { Groq } from "groq-sdk"

// Initialize Groq client only when API key is available
let groq: Groq | null = null
if (process.env.GROQ_API_KEY) {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  })
}

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    if (!groq) {
      return Response.json({ 
        error: "Speech transcription service unavailable - GROQ_API_KEY not configured" 
      }, { status: 503 })
    }
    
    const formData = await req.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return Response.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Transcribe using GROQ Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "distil-whisper-large-v3-en",
      language: "en",
      response_format: "text",
    })

    return Response.json({
      success: true,
      transcript: transcription,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Transcription error:", error)
    return Response.json(
      {
        error: "Transcription failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
