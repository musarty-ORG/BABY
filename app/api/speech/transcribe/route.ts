import type { NextRequest } from "next/server"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return Response.json({ error: "Audio file is required" }, { status: 400 })
    }

    // Create FormData for GROQ API
    const groqFormData = new FormData()
    groqFormData.append("file", audioFile)
    groqFormData.append("model", "distil-whisper-large-v3-en")
    groqFormData.append("response_format", "json")

    // Call GROQ Transcription API
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: groqFormData,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("GROQ transcription error:", error)
      return Response.json({ error: "Transcription failed" }, { status: 500 })
    }

    const result = await response.json()

    return Response.json({
      success: true,
      transcript: result.text || "",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Transcription processing error:", error)
    return Response.json(
      {
        error: "Transcription processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
