import type { NextRequest } from "next/server"
import { searchEngine } from "@/lib/search-engine"

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      query,
      includeAnswer = true,
      includeImages = false,
      includeRawContent = false,
      maxResults = 10,
      searchDepth = "basic",
      includeDomains,
      excludeDomains,
      topic = "general",
      days,
    } = body

    if (!query || typeof query !== "string") {
      return Response.json({ error: "Query is required and must be a string" }, { status: 400 })
    }

    if (!process.env.TAVILY_API_KEY) {
      return Response.json({ error: "Search service not configured - TAVILY_API_KEY missing" }, { status: 500 })
    }

    // Validate search depth and max results
    if (searchDepth === "advanced" && maxResults > 20) {
      return Response.json(
        {
          error: "Advanced search depth allows maximum 20 results",
        },
        { status: 400 },
      )
    }

    // Validate topic and days
    if (topic === "news" && days && (days < 1 || days > 30)) {
      return Response.json(
        {
          error: "Days parameter for news search must be between 1 and 30",
        },
        { status: 400 },
      )
    }

    const result = await searchEngine.search(query, {
      includeAnswer,
      includeImages,
      includeRawContent,
      maxResults,
      searchDepth,
      includeDomains,
      excludeDomains,
      topic,
      days,
    })

    return Response.json(result)
  } catch (error) {
    console.error("Search API error:", error)
    return Response.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")

  if (!query) {
    return Response.json({ error: 'Query parameter "q" is required' }, { status: 400 })
  }

  try {
    const result = await searchEngine.search(query, {
      includeAnswer: searchParams.get("answer") === "true",
      includeImages: searchParams.get("images") === "true",
      maxResults: Number.parseInt(searchParams.get("limit") || "10"),
      searchDepth: (searchParams.get("depth") as "basic" | "advanced") || "basic",
      topic: (searchParams.get("topic") as "general" | "news") || "general",
      days: searchParams.get("days") ? Number.parseInt(searchParams.get("days")) : undefined,
    })

    return Response.json(result)
  } catch (error) {
    console.error("Search API error:", error)
    return Response.json(
      {
        error: "Search failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
