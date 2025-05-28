import type { NextRequest } from "next/server"
import { predictiveEngine } from "@/lib/predictive-evolution"

export const maxDuration = 10

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, action, context, metadata } = body

    if (!userId || !action || !context) {
      return Response.json({ error: "Missing required fields: userId, action, context" }, { status: 400 })
    }

    await predictiveEngine.trackUserBehavior({
      userId,
      action,
      context: {
        projectType: context.projectType || "unknown",
        codePattern: context.codePattern || "unknown",
        timestamp: new Date().toISOString(),
        success: context.success ?? true,
        timeSpent: context.timeSpent || 0,
      },
      metadata,
    })

    return Response.json({
      success: true,
      message: "Behavior tracked successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Behavior tracking error:", error)
    return Response.json(
      {
        error: "Behavior tracking failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const projectType = searchParams.get("projectType")

    if (!userId) {
      return Response.json({ error: "userId parameter is required" }, { status: 400 })
    }

    // Generate insights based on user behavior
    const insights = await predictiveEngine.generatePredictiveInsights(userId, projectType || "unknown", {})

    return Response.json({
      success: true,
      insights,
      count: insights.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Behavior insights error:", error)
    return Response.json(
      {
        error: "Failed to get behavior insights",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
