import type { NextRequest } from "next/server"
import { orchestrator } from "@/lib/pipeline-orchestrator"
import { pipelineLogger } from "@/lib/pipeline-logger"
import type { PipelineRequest } from "@/types/pipeline"
import { anthropic } from "@ai-sdk/anthropic"
import { google } from "@ai-sdk/google"
import { streamText } from "ai"
import { crawlEngine } from "@/lib/crawl-engine"
import { generateRegistryPrompt } from "@/lib/component-registries"
import { withErrorHandler } from "@/lib/error-handler"
import { multiAgentRequestSchema } from "@/lib/validation-schemas"
import { simpleCounter } from "@/lib/rate-limiter"
import { analyticsEngine } from "@/lib/analytics-engine"

export const maxDuration = 60

// Dual AI Model Generation Function
async function handleDualModelGeneration(request: PipelineRequest, userId: string) {
  try {
    await pipelineLogger.logStage(request.requestId, "DUAL_MODEL_START", null, "Starting dual model generation", 0)
    
    // Increment counter for API usage
    await simpleCounter.incrementCounter(userId, simpleCounter.CATEGORIES.API_CALLS)

    // Real-time knowledge through crawling
    let realTimeKnowledge = ""
    try {
      if (request.prompt) {
        const searchQuery = `${request.prompt} modern web development 2024 best practices`
        const crawlResult = await crawlEngine.crawl("https://developer.mozilla.org", {
          maxDepth: 1,
          limit: 2,
          extractDepth: "basic"
        })

        if (crawlResult?.results?.length > 0) {
          realTimeKnowledge = `=== REAL-TIME KNOWLEDGE (${new Date().toISOString()}) ===\n\n`
          realTimeKnowledge += `CURRENT BEST PRACTICES:\n`
          crawlResult.results.slice(0, 2).forEach((result, index) => {
            realTimeKnowledge += `${index + 1}. ${result.title}\n   ${result.content.substring(0, 200)}...\n\n`
          })
          realTimeKnowledge += `=== END REAL-TIME KNOWLEDGE ===\n\n`
        }
      }
    } catch (crawlError) {
      console.warn("Real-time crawl failed:", crawlError)
    }

    const basePrompt = `You are a specialized AI code generation model with real-time knowledge access.

${realTimeKnowledge}

${generateRegistryPrompt()}

Generate a complete, production-ready website based on this request:

${request.prompt}

Requirements:
- Use modern React/Next.js patterns and practices from 2024
- Include responsive design with Tailwind CSS
- Add proper TypeScript types
- Include error handling and loading states
- Use current best practices for performance and SEO
- Make it visually appealing and professional
- Prefer using established component libraries (shadcn/ui, Headless UI, Radix UI, Chakra UI)
- Include proper installation commands in comments

Generate clean, functional code ready for deployment.`

    // Model 1: Anthropic Claude Sonnet 4
    const model1Promise = streamText({
      model: anthropic("claude-3-5-sonnet-20241022"),
      prompt: basePrompt,
      system: "You are Claude, an expert web developer. Create complete, production-ready code with modern patterns and best practices.",
    })

    // Model 2: Google Vertex AI Gemini
    const model2Promise = streamText({
      model: google("gemini-1.5-pro"),
      prompt: basePrompt,
      system: "You are Gemini, a powerful code generation AI. Focus on clean, efficient, and modern code architecture.",
    })

    // Run both models in parallel and get results
    const [model1Result, model2Result] = await Promise.allSettled([
      model1Promise.then(r => r.toDataStreamResponse()),
      model2Promise.then(r => r.toDataStreamResponse())
    ])

    // Track dual model execution
    await analyticsEngine.trackEvent({
      type: "api_call",
      endpoint: "/api/multi-agent/dual-model",
      method: "POST",
      status_code: 200,
      user_id: userId,
      metadata: { 
        agentMode: "dual-model", 
        model1Status: model1Result.status,
        model2Status: model2Result.status
      },
    })

    // Return the first successful result (fallback to either model)
    if (model1Result.status === "fulfilled") {
      await pipelineLogger.logStage(request.requestId, "DUAL_MODEL_COMPLETE", null, "Primary model (Claude) succeeded", 0)
      return model1Result.value
    } else if (model2Result.status === "fulfilled") {
      await pipelineLogger.logStage(request.requestId, "DUAL_MODEL_COMPLETE", null, "Secondary model (Gemini) succeeded", 0)
      return model2Result.value
    } else {
      throw new Error("Both AI models failed to generate code")
    }

  } catch (error) {
    await pipelineLogger.logError(request.requestId, "DUAL_MODEL", `Dual model generation failed: ${error}`, false)
    throw error
  }
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Get user ID from request (simplified auth)
  const userId = req.headers.get("x-user-id") || "anonymous"
  
  // Increment API counter for usage tracking
  await simpleCounter.incrementCounter(userId, simpleCounter.CATEGORIES.API_CALLS)

  // Check if required AI services are available
  if (!process.env.ANTHROPIC_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { 
        success: false, 
        error: "AI services temporarily unavailable. Please try again later or contact support." 
      },
      { status: 503 }
    )
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
    userId: userId,
  }

  await pipelineLogger.logStage(requestId, "API_REQUEST", request, null, 0)

  switch (agentMode) {
    case "code-gen":
      return await handleCodeGeneration(request, userId)

    case "review":
      return await handleCodeReview(request, userId)

    case "full-pipeline":
      return await handleFullPipeline(request, userId)

    case "dual-model":
      return await handleDualModelGeneration(request, userId)

    default:
      throw new Error("Invalid agent mode")
  }
})

async function handleCodeGeneration(request: PipelineRequest, userId: string) {
  try {
    // Increment API usage counter
    await simpleCounter.incrementCounter(userId, simpleCounter.CATEGORIES.API_CALLS)

    // Get real-time knowledge for code generation through crawling
    let realTimeKnowledge = ""
    try {
      const crawlResult = await crawlEngine.crawlDocumentation("https://nextjs.org/docs", {
        maxDepth: 1,
        limit: 3,
        extractDepth: "basic"
      })

      if (crawlResult.results.length > 0) {
        realTimeKnowledge = `\n\n=== REAL-TIME KNOWLEDGE ===\n`
        realTimeKnowledge += `CURRENT BEST PRACTICES:\n`
        crawlResult.results.slice(0, 2).forEach((result, index) => {
          realTimeKnowledge += `${index + 1}. ${result.title}\n   ${result.content.substring(0, 200)}...\n\n`
        })
        realTimeKnowledge += `=== END REAL-TIME KNOWLEDGE ===\n\n`
      }
    } catch (crawlError) {
      console.warn("Real-time crawl failed:", crawlError)
    }

    const codeGenPrompt = `You are an expert code generation AI with real-time knowledge access.

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
      model: anthropic("claude-3-5-sonnet-20241022"),
      prompt: codeGenPrompt,
      system:
        "You are a code generation specialist with real-time knowledge access. Use modern patterns and current best practices. Output only clean, functional code.",
    })

    // Track code generation
    await analyticsEngine.trackEvent({
      type: "api_call",
      endpoint: "/api/multi-agent/code-gen",
      method: "POST",
      status_code: 200,
      user_id: userId,
      metadata: { agentMode: "code-gen" },
    })

    return result.toDataStreamResponse()
  } catch (error) {
    await pipelineLogger.logError(request.requestId, "CODE_GEN", `Streaming code generation failed: ${error}`, false)
    throw error
  }
}

async function handleCodeReview(request: PipelineRequest, userId: string) {
  try {
    if (!request.codeToReview) {
      throw new Error("No code provided for review")
    }

    // Increment API usage counter
    await simpleCounter.incrementCounter(userId, simpleCounter.CATEGORIES.API_CALLS)

    const reviewPrompt = `You are an expert code reviewer and mentor. Review this code:

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
      model: anthropic("claude-3-5-sonnet-20241022"),
      prompt: reviewPrompt,
      system:
        "You are a senior code reviewer and mentor. Provide thorough, constructive code reviews.",
    })

    // Track code review
    await analyticsEngine.trackEvent({
      type: "api_call",
      endpoint: "/api/multi-agent/review",
      method: "POST",
      status_code: 200,
      user_id: userId,
      metadata: { agentMode: "review" },
    })

    return result.toDataStreamResponse()
  } catch (error) {
    await pipelineLogger.logError(request.requestId, "REVIEW", `Streaming code review failed: ${error}`, false)
    throw error
  }
}

async function handleFullPipeline(request: PipelineRequest, userId: string) {
  try {
    // Increment API usage counter
    await simpleCounter.incrementCounter(userId, simpleCounter.CATEGORIES.API_CALLS)

    const result = await orchestrator.executeFullPipeline(request)

    await pipelineLogger.logStage(request.requestId, "API_RESPONSE", null, result, 0)

    // Track full pipeline execution
    await analyticsEngine.trackEvent({
      type: "api_call",
      endpoint: "/api/multi-agent/full-pipeline",
      method: "POST",
      status_code: 200,
      user_id: userId,
      metadata: { agentMode: "full-pipeline" },
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
