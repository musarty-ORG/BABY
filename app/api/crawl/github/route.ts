import type { NextRequest } from "next/server"
import { crawlEngine } from "@/lib/crawl-engine"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { repoUrl, ...options } = body

    if (!repoUrl || typeof repoUrl !== "string") {
      return Response.json({ error: "repoUrl is required and must be a string" }, { status: 400 })
    }

    if (!repoUrl.includes("github.com")) {
      return Response.json({ error: "URL must be a GitHub repository" }, { status: 400 })
    }

    if (!process.env.TAVILY_API_KEY) {
      return Response.json({ error: "Crawl service not configured" }, { status: 500 })
    }

    const result = await crawlEngine.crawlGitHubRepo(repoUrl, options)

    return Response.json(result)
  } catch (error) {
    console.error("GitHub crawl API error:", error)
    return Response.json(
      {
        error: "GitHub crawl failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
