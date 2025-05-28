import { type NextRequest, NextResponse } from "next/server"
import { agenticEngine, type AgenticRequest } from "@/lib/agentic-engine"

export const maxDuration = 60 // Agentic tools may take longer

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

    console.log("🤖 Processing agentic request:", request.message)

    const result = await agenticEngine.processAgenticRequest(request)

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        model: request.model,
        toolsEnabled: {
          webSearch: request.enableWebSearch,
          codeExecution: request.enableCodeExecution,
        },
        processingTime: result.totalDuration,
      },
    })
  } catch (error) {
    console.error("❌ Agentic processing error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Agentic processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
