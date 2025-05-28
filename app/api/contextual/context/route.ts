import type { NextRequest } from "next/server"
import { contextualAssistant } from "@/lib/contextual-assistant"

export const maxDuration = 15

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const projectId = searchParams.get("projectId")

    if (!userId || !projectId) {
      return Response.json({ error: "userId and projectId are required" }, { status: 400 })
    }

    const context = await contextualAssistant.getProjectContext(userId, projectId)

    if (!context) {
      return Response.json({ error: "Project context not found" }, { status: 404 })
    }

    return Response.json({
      success: true,
      context,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Context retrieval error:", error)
    return Response.json(
      {
        error: "Context retrieval failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, projectData } = body

    if (!userId || !projectData) {
      return Response.json({ error: "userId and projectData are required" }, { status: 400 })
    }

    const context = await contextualAssistant.createProjectContext(userId, projectData)

    return Response.json({
      success: true,
      context,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Context creation error:", error)
    return Response.json(
      {
        error: "Context creation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, projectId, updates } = body

    if (!userId || !projectId || !updates) {
      return Response.json({ error: "userId, projectId, and updates are required" }, { status: 400 })
    }

    const context = await contextualAssistant.updateProjectContext(userId, projectId, updates)

    return Response.json({
      success: true,
      context,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Context update error:", error)
    return Response.json(
      {
        error: "Context update failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
