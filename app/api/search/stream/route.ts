import type { NextRequest } from "next/server"
import { searchEngine } from "@/lib/search-engine"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, options = {} } = body

    if (!query || typeof query !== "string") {
      return Response.json({ error: "Query is required and must be a string" }, { status: 400 })
    }

    // Create a readable stream for real-time search results
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "status",
                message: "Starting search...",
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          )

          // Perform search
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "status",
                message: "Searching with Tavily...",
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          )

          const result = await searchEngine.search(query, options)

          // Send results incrementally
          if (result.answer) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: "answer",
                  data: result.answer,
                  timestamp: new Date().toISOString(),
                })}\n\n`,
              ),
            )
          }

          // Send results one by one
          for (let i = 0; i < result.results.length; i++) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: "result",
                  data: result.results[i],
                  index: i,
                  total: result.results.length,
                  timestamp: new Date().toISOString(),
                })}\n\n`,
              ),
            )

            // Small delay to simulate real-time streaming
            await new Promise((resolve) => setTimeout(resolve, 100))
          }

          // Send images if available
          if (result.images && result.images.length > 0) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: "images",
                  data: result.images,
                  timestamp: new Date().toISOString(),
                })}\n\n`,
              ),
            )
          }

          // Send follow-up questions
          if (result.followUpQuestions && result.followUpQuestions.length > 0) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: "followup",
                  data: result.followUpQuestions,
                  timestamp: new Date().toISOString(),
                })}\n\n`,
              ),
            )
          }

          // Send completion
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "complete",
                data: {
                  searchTime: result.searchTime,
                  cached: result.cached,
                  totalResults: result.results.length,
                },
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          )

          controller.close()
        } catch (error) {
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Stream search API error:", error)
    return Response.json(
      {
        error: "Stream search failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
