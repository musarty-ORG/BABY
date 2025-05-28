import type { NextRequest } from "next/server"
import { crawlEngine } from "@/lib/crawl-engine"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, targetUrls, ...crawlOptions } = body

    if (!query || typeof query !== "string") {
      return Response.json({ error: "query is required and must be a string" }, { status: 400 })
    }

    if (!targetUrls || !Array.isArray(targetUrls) || targetUrls.length === 0) {
      return Response.json({ error: "targetUrls is required and must be a non-empty array" }, { status: 400 })
    }

    if (targetUrls.length > 5) {
      return Response.json({ error: "Maximum 5 target URLs allowed" }, { status: 400 })
    }

    if (!process.env.TAVILY_API_KEY) {
      return Response.json({ error: "Search and crawl service not configured" }, { status: 500 })
    }

    const result = await crawlEngine.searchAndCrawl(query, targetUrls, crawlOptions)

    return Response.json(result)
  } catch (error) {
    console.error("Search and crawl API error:", error)
    return Response.json(
      {
        error: "Search and crawl failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
