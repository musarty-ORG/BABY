import type { NextRequest } from "next/server"
import { agenticEngine, type AgenticRequest } from "@/lib/agentic-engine"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const request: AgenticRequest = {
      message: body.message,
      model: body.model || "compound-beta",
      maxToolCalls: body.maxToolCalls || 5,
      enableWebSearch: body.enableWebSearch !== false,
      enableCodeExecution: body.enableCodeExecution !== false,
      context: body.context,
    }

    console.log("🌊 Streaming agentic request:", request.message)

    const stream = await agenticEngine.streamAgenticResponse(request)

    return stream.toDataStreamResponse()
  } catch (error) {
    console.error("❌ Agentic streaming error:", error)
    return new Response(
      JSON.stringify({
        error: "Agentic streaming failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
