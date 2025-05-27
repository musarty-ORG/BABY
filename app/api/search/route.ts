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
    } = body

    if (!query || typeof query !== "string") {
      return Response.json({ error: "Query is required and must be a string" }, { status: 400 })
    }

    if (!process.env.TAVILY_API_KEY) {
      return Response.json({ error: "Search service not configured" }, { status: 500 })
    }

    const result = await searchEngine.search(query, {
      includeAnswer,
      includeImages,
      includeRawContent,
      maxResults,
      searchDepth,
      includeDomains,
      excludeDomains,
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
