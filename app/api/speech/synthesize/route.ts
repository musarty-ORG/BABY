import type { NextRequest } from "next/server"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { text, voice = "Cheyenne-PlayAI", model = "playai-tts", response_format = "wav" } = await req.json()

    if (!text) {
      return Response.json({ error: "Text is required" }, { status: 400 })
    }

    // Call GROQ Speech API
    const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        response_format,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("GROQ speech synthesis error:", error)
      return Response.json({ error: "Speech synthesis failed" }, { status: 500 })
    }

    // Return the audio data
    const audioBuffer = await response.arrayBuffer()

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("Speech synthesis processing error:", error)
    return Response.json(
      {
        error: "Speech synthesis processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
