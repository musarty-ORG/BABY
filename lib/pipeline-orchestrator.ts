import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import type { PipelineRequest, RawCode, ReviewedCode, PipelineResult, PipelineIteration } from "@/types/pipeline"
import { pipelineLogger } from "./pipeline-logger"

export class PipelineOrchestrator {
  private readonly MAX_RETRIES = 3
  private readonly GENERATION_TIMEOUT = 30000
  private readonly REVIEW_TIMEOUT = 20000

  async executeFullPipeline(request: PipelineRequest): Promise<PipelineResult> {
    const startTime = Date.now()
    const iterations: PipelineIteration[] = []
    let currentCode = ""
    let finalStatus: "SUCCESS" | "FAILED" | "PARTIAL" = "FAILED"

    await pipelineLogger.logStage(request.requestId, "PIPELINE_START", request, null, 0)

    try {
      for (let iteration = 1; iteration <= this.MAX_RETRIES; iteration++) {
        await pipelineLogger.logStage(
          request.requestId,
          `ITERATION_${iteration}_START`,
          { iteration, prompt: request.prompt },
          null,
          0,
        )

        // Step 1: Generate Code
        const rawCode = await this.generateCode(request, iteration > 1 ? currentCode : undefined)

        // Step 2: Review Code
        const review = await this.reviewCode(rawCode, request)

        // Step 3: Create iteration record
        const pipelineIteration: PipelineIteration = {
          iterationNumber: iteration,
          rawCode,
          review,
          action: review.verdict === "APPROVE" ? "APPROVED" : iteration < this.MAX_RETRIES ? "RETRY" : "FAILED",
          timestamp: new Date().toISOString(),
        }

        iterations.push(pipelineIteration)
        currentCode = rawCode.code

        await pipelineLogger.logStage(request.requestId, `ITERATION_${iteration}_COMPLETE`, pipelineIteration, null, 0)

        // Check if approved
        if (review.verdict === "APPROVE") {
          finalStatus = "SUCCESS"
          break
        }

        // Check if we should retry
        if (review.verdict === "NEEDS_REVISION" && iteration < this.MAX_RETRIES) {
          // Prepare feedback for next iteration
          request.prompt = this.enhancePromptWithFeedback(request.prompt, review)
          continue
        }

        // If we reach here, either REJECT or max retries reached
        if (iteration === this.MAX_RETRIES) {
          finalStatus = "PARTIAL" // We have code, but it's not approved
        }
      }
    } catch (error) {
      await pipelineLogger.logError(request.requestId, "ORCHESTRATION", `Pipeline execution failed: ${error}`, false)
      finalStatus = "FAILED"
    }

    const totalTime = Date.now() - startTime
    const result: PipelineResult = {
      requestId: request.requestId,
      originalPrompt: request.prompt,
      finalCode: currentCode,
      iterations,
      status: finalStatus,
      totalTime,
      timestamp: new Date().toISOString(),
      errorLog: pipelineLogger.getErrorsForRequest(request.requestId),
    }

    await pipelineLogger.persistPipelineResult(result)
    return result
  }

  private async generateCode(request: PipelineRequest, previousCode?: string): Promise<RawCode> {
    const startTime = Date.now()

    try {
      let enhancedPrompt = request.prompt

      if (previousCode) {
        enhancedPrompt = `REVISION REQUIRED - Previous code had issues. Please improve:

ORIGINAL REQUEST: ${request.prompt}

PREVIOUS CODE:
\`\`\`
${previousCode}
\`\`\`

Generate improved code that addresses the feedback.`
      }

      const codeGenPrompt = `You are v0-1.0-md, a specialized code generation model. Generate clean, functional code based on this request:

${enhancedPrompt}

Focus on:
- Clean, readable code
- Best practices
- Proper structure
- Working functionality
- Security considerations

Generate ONLY the code, no explanations:`

      await pipelineLogger.logStage(request.requestId, "CODE_GEN_START", { prompt: enhancedPrompt }, null, 0)

      const result = await Promise.race([
        generateText({
          model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
          prompt: codeGenPrompt,
          system: "You are v0-1.0-md, a code generation specialist. Output only clean, functional code.",
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Code generation timeout")), this.GENERATION_TIMEOUT),
        ),
      ])

      const generationTime = Date.now() - startTime
      const rawCode: RawCode = {
        requestId: request.requestId,
        prompt: request.prompt,
        code: (result as any).text,
        metadata: {
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          generationTime,
          tokenCount: (result as any).usage?.totalTokens,
        },
        timestamp: new Date().toISOString(),
      }

      await pipelineLogger.logStage(request.requestId, "CODE_GEN_COMPLETE", enhancedPrompt, rawCode, generationTime)

      return rawCode
    } catch (error) {
      await pipelineLogger.logError(request.requestId, "CODE_GEN", `Code generation failed: ${error}`, false)
      throw new Error(`Code generation failed: ${error}`)
    }
  }

  private async reviewCode(rawCode: RawCode, request: PipelineRequest): Promise<ReviewedCode> {
    const startTime = Date.now()

    try {
      const reviewPrompt = `You are the Groq Supervisor, an expert code reviewer and mentor. Review this code generated by v0-1.0-md:

ORIGINAL REQUEST: ${rawCode.prompt}

CODE TO REVIEW:
\`\`\`
${rawCode.code}
\`\`\`

Provide a structured review in this EXACT format:

QUALITY_SCORE: [1-10]
SECURITY_ISSUES: [list any security concerns, or "NONE"]
PERFORMANCE_ISSUES: [list any performance concerns, or "NONE"]
REVIEW_NOTES: [detailed feedback]
SUGGESTED_FIXES: [specific improvements, or "NONE"]
VERDICT: [APPROVE/REJECT/NEEDS_REVISION]

Be thorough but constructive in your review.`

      await pipelineLogger.logStage(request.requestId, "REVIEW_START", { code: rawCode.code }, null, 0)

      const result = await Promise.race([
        generateText({
          model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
          prompt: reviewPrompt,
          system: "You are the Groq Supervisor - a senior code reviewer. Provide structured, actionable code reviews.",
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Review timeout")), this.REVIEW_TIMEOUT)),
      ])

      const reviewTime = Date.now() - startTime
      const reviewText = (result as any).text

      // Parse structured review
      const parsedReview = this.parseReviewResponse(reviewText)

      const reviewedCode: ReviewedCode = {
        requestId: request.requestId,
        prompt: rawCode.prompt,
        code: rawCode.code,
        reviewNotes: [reviewText],
        qualityScore: parsedReview.qualityScore,
        securityIssues: parsedReview.securityIssues,
        performanceIssues: parsedReview.performanceIssues,
        verdict: parsedReview.verdict,
        suggestedFixes: parsedReview.suggestedFixes,
        metadata: {
          reviewer: "meta-llama/llama-4-maverick-17b-128e-instruct",
          reviewTime,
        },
        timestamp: new Date().toISOString(),
      }

      await pipelineLogger.logStage(request.requestId, "REVIEW_COMPLETE", rawCode.code, reviewedCode, reviewTime)

      return reviewedCode
    } catch (error) {
      await pipelineLogger.logError(request.requestId, "REVIEW", `Code review failed: ${error}`, false)

      // Fallback review - don't crash the pipeline
      return {
        requestId: request.requestId,
        prompt: rawCode.prompt,
        code: rawCode.code,
        reviewNotes: [`Review failed: ${error}. Proceeding with caution.`],
        qualityScore: 5,
        securityIssues: ["Review system unavailable - manual review recommended"],
        performanceIssues: [],
        verdict: "NEEDS_REVISION",
        timestamp: new Date().toISOString(),
      }
    }
  }

  private parseReviewResponse(reviewText: string): {
    qualityScore: number
    securityIssues: string[]
    performanceIssues: string[]
    verdict: "APPROVE" | "REJECT" | "NEEDS_REVISION"
    suggestedFixes: string[]
  } {
    try {
      const qualityMatch = reviewText.match(/QUALITY_SCORE:\s*(\d+)/)
      const securityMatch = reviewText.match(/SECURITY_ISSUES:\s*(.+?)(?=\n|$)/s)
      const performanceMatch = reviewText.match(/PERFORMANCE_ISSUES:\s*(.+?)(?=\n|$)/s)
      const verdictMatch = reviewText.match(/VERDICT:\s*(APPROVE|REJECT|NEEDS_REVISION)/)
      const fixesMatch = reviewText.match(/SUGGESTED_FIXES:\s*(.+?)(?=\n|$)/s)

      return {
        qualityScore: qualityMatch ? Number.parseInt(qualityMatch[1]) : 5,
        securityIssues: securityMatch && securityMatch[1] !== "NONE" ? [securityMatch[1].trim()] : [],
        performanceIssues: performanceMatch && performanceMatch[1] !== "NONE" ? [performanceMatch[1].trim()] : [],
        verdict: (verdictMatch?.[1] as any) || "NEEDS_REVISION",
        suggestedFixes: fixesMatch && fixesMatch[1] !== "NONE" ? [fixesMatch[1].trim()] : [],
      }
    } catch (error) {
      // Fallback parsing
      return {
        qualityScore: 5,
        securityIssues: [],
        performanceIssues: [],
        verdict: "NEEDS_REVISION",
        suggestedFixes: [],
      }
    }
  }

  private enhancePromptWithFeedback(originalPrompt: string, review: ReviewedCode): string {
    const feedback = [
      ...review.reviewNotes,
      ...review.securityIssues.map((issue) => `Security: ${issue}`),
      ...review.performanceIssues.map((issue) => `Performance: ${issue}`),
      ...(review.suggestedFixes || []),
    ].join("\n")

    return `${originalPrompt}

IMPORTANT - Address this feedback from previous iteration:
${feedback}`
  }
}

export const orchestrator = new PipelineOrchestrator()
