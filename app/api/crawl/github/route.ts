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

    // Strict URL validation: enforce scheme, host, and path requirements
    let parsedUrl: URL
    try {
      parsedUrl = new URL(repoUrl)
    } catch {
      return Response.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Only allow http or https schemes
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return Response.json({ error: "URL must use http or https protocol" }, { status: 400 })
    }

    // Only allow github.com or www.github.com as host
    const allowedHosts = ["github.com", "www.github.com"]
    if (!allowedHosts.includes(parsedUrl.hostname.toLowerCase())) {
      return Response.json({ error: "URL must be from github.com" }, { status: 400 })
    }

    // Require owner/repo path (at least 2 path segments)
    const pathSegments = parsedUrl.pathname.split("/").filter((seg) => seg.length > 0)
    if (pathSegments.length < 2) {
      return Response.json(
        { error: "URL must include repository owner and name (e.g., github.com/owner/repo)" },
        { status: 400 },
      )
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
