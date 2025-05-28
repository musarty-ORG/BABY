import { type NextRequest, NextResponse } from "next/server"
import { agenticEngine } from "@/lib/agentic-engine"

export const maxDuration = 60 // Maximum allowed duration

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()

    if (!query) {
      return NextResponse.json({ success: false, error: "Query is required" }, { status: 400 })
    }

    console.log("⚖️ Comparing agentic models for:", query)

    const comparison = await agenticEngine.compareModels(query)

    return NextResponse.json({
      success: true,
      data: comparison,
      metadata: {
        query,
        comparisonTime: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Model comparison error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Model comparison failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
