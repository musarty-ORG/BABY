import type { NextRequest } from "next/server"
import { orchestrator } from "@/lib/pipeline-orchestrator"
import { pipelineLogger } from "@/lib/pipeline-logger"
import type { PipelineRequest } from "@/types/pipeline"
import { groq } from "@ai-sdk/groq"
import { streamText } from "ai"
import { searchEngine } from "@/lib/search-engine"
import { withErrorHandler } from "@/lib/error-handler"
import { multiAgentRequestSchema } from "@/lib/validation-schemas"
import { requireAuth, checkRateLimit } from "@/lib/auth-middleware"
import { analyticsEngine } from "@/lib/analytics-engine"

export const maxDuration = 60

export const POST = withErrorHandler(async (req: NextRequest) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Authenticate user
  const session = await requireAuth(req)

  // Rate limiting - 20 pipeline requests per hour for regular users
  if (session.authType !== "api_key") {
    await checkRateLimit(req, session.id, 20, 3600)
  }

  // Check if GROQ_API_KEY is available
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY environment variable is missing")
  }

  const validatedBody = multiAgentRequestSchema.parse(await req.json())
  const { prompt, agentMode, codeToReview, maxRetries = 3, fileUrl, mode, stylePreferences } = validatedBody

  const request: PipelineRequest = {
    requestId,
    prompt,
    agentMode,
    mode,
    codeToReview,
    fileUrl,
    stylePreferences,
    maxRetries,
    timestamp: new Date().toISOString(),
    userId: session.id, // Add user tracking
  }

  await pipelineLogger.logStage(requestId, "API_REQUEST", request, null, 0)

  switch (agentMode) {
    case "code-gen":
      return await handleCodeGeneration(request, session)

    case "review":
      return await handleCodeReview(request, session)

    case "full-pipeline":
      return await handleFullPipeline(request, session)

    default:
      throw new Error("Invalid agent mode")
  }
})

async function handleCodeGeneration(request: PipelineRequest, session: any) {
  try {
    // Get real-time knowledge for code generation
    let realTimeKnowledge = ""
    try {
      const searchResult = await searchEngine.search(request.prompt, {
        includeAnswer: true,
        maxResults: 3,
        searchDepth: "advanced",
        includeDomains: [
          "github.com",
          "stackoverflow.com",
          "nextjs.org",
          "react.dev",
          "tailwindcss.com",
          "developer.mozilla.org",
        ],
      })

      if (searchResult.answer || searchResult.results.length > 0) {
        realTimeKnowledge = `\n\n=== REAL-TIME KNOWLEDGE ===\n`

        if (searchResult.answer) {
          realTimeKnowledge += `CURRENT BEST PRACTICES: ${searchResult.answer}\n\n`
        }

        realTimeKnowledge += `MODERN EXAMPLES:\n`
        searchResult.results.slice(0, 2).forEach((result, index) => {
          realTimeKnowledge += `${index + 1}. ${result.title}\n   ${result.content.substring(0, 200)}...\n\n`
        })

        realTimeKnowledge += `=== END REAL-TIME KNOWLEDGE ===\n\n`
      }
    } catch (searchError) {
      console.warn("Real-time search failed:", searchError)
    }

    const codeGenPrompt = `You are v0-1.0-md, a specialized code generation model with real-time knowledge access.

${realTimeKnowledge}

Generate clean, functional code based on this request:

${request.prompt}

Use the real-time knowledge above to implement:
- Modern patterns and practices from 2024
- Latest framework features and best practices
- Current security and performance optimizations
- Up-to-date component patterns

Focus on:
- Clean, readable code using current standards
- Best practices from real-time knowledge
- Proper structure following latest conventions
- Working functionality with modern approaches
- Security considerations from current practices

Generate the code without explanations, just the code:`

    const result = streamText({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      prompt: codeGenPrompt,
      system:
        "You are v0-1.0-md, a code generation specialist with real-time knowledge access. Use modern patterns and current best practices. Output only clean, functional code.",
    })

    // Track code generation
    await analyticsEngine.trackEvent({
      type: "api_call",
      endpoint: "/api/multi-agent/code-gen",
      method: "POST",
      status_code: 200,
      user_id: session.id,
      metadata: { agentMode: "code-gen", authType: session.authType },
    })

    return result.toDataStreamResponse()
  } catch (error) {
    await pipelineLogger.logError(request.requestId, "CODE_GEN", `Streaming code generation failed: ${error}`, false)
    throw error
  }
}

async function handleCodeReview(request: PipelineRequest, session: any) {
  try {
    if (!request.codeToReview) {
      throw new Error("No code provided for review")
    }

    const reviewPrompt = `You are the Groq Supervisor, an expert code reviewer and mentor. Review this code:

ORIGINAL REQUEST: ${request.prompt}

CODE TO REVIEW:
\`\`\`
${request.codeToReview}
\`\`\`

Provide a structured review with:
1. Code quality assessment (1-10)
2. Security analysis
3. Performance considerations
4. Best practices compliance
5. Suggested improvements
6. Final verdict: APPROVE/REJECT/NEEDS_REVISION

Be thorough but constructive in your review.`

    const result = streamText({
      model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
      prompt: reviewPrompt,
      system:
        "You are the Groq Supervisor - a senior code reviewer and mentor. Provide thorough, constructive code reviews.",
    })

    // Track code review
    await analyticsEngine.trackEvent({
      type: "api_call",
      endpoint: "/api/multi-agent/review",
      method: "POST",
      status_code: 200,
      user_id: session.id,
      metadata: { agentMode: "review", authType: session.authType },
    })

    return result.toDataStreamResponse()
  } catch (error) {
    await pipelineLogger.logError(request.requestId, "REVIEW", `Streaming code review failed: ${error}`, false)
    throw error
  }
}

async function handleFullPipeline(request: PipelineRequest, session: any) {
  try {
    const result = await orchestrator.executeFullPipeline(request)

    await pipelineLogger.logStage(request.requestId, "API_RESPONSE", null, result, 0)

    // Track full pipeline execution
    await analyticsEngine.trackEvent({
      type: "api_call",
      endpoint: "/api/multi-agent/full-pipeline",
      method: "POST",
      status_code: 200,
      user_id: session.id,
      metadata: { agentMode: "full-pipeline", authType: session.authType },
    })

    return Response.json(result)
  } catch (error) {
    await pipelineLogger.logError(request.requestId, "ORCHESTRATION", `Full pipeline execution failed: ${error}`, false)

    // Return partial result if available
    return Response.json(
      {
        requestId: request.requestId,
        originalPrompt: request.prompt,
        finalCode: "",
        iterations: [],
        status: "FAILED",
        totalTime: 0,
        timestamp: new Date().toISOString(),
        errorLog: pipelineLogger.getErrorsForRequest(request.requestId),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
