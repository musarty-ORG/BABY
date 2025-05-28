import type { NextRequest } from "next/server"
import { crawlEngine } from "@/lib/crawl-engine"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      url,
      maxDepth = 2,
      maxBreadth = 50,
      limit = 100,
      extractDepth = "basic",
      selectPaths,
      excludePaths,
      selectDomains,
      excludeDomains,
      categories,
      instructions,
      includeImages = false,
      includePdfs = false,
      includeRawHtml = false,
    } = body

    if (!url || typeof url !== "string") {
      return Response.json({ error: "URL is required and must be a string" }, { status: 400 })
    }

    if (!process.env.TAVILY_API_KEY) {
      return Response.json({ error: "Crawl service not configured - TAVILY_API_KEY missing" }, { status: 500 })
    }

    // Validate parameters
    if (maxDepth < 1 || maxDepth > 5) {
      return Response.json({ error: "maxDepth must be between 1 and 5" }, { status: 400 })
    }

    if (limit > 1000) {
      return Response.json({ error: "limit cannot exceed 1000 pages" }, { status: 400 })
    }

    const result = await crawlEngine.crawl(url, {
      maxDepth,
      maxBreadth,
      limit,
      extractDepth,
      selectPaths,
      excludePaths,
      selectDomains,
      excludeDomains,
      categories,
      instructions,
      includeImages,
      includePdfs,
      includeRawHtml,
    })

    return Response.json(result)
  } catch (error) {
    console.error("Crawl API error:", error)
    return Response.json(
      {
        error: "Crawl failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
