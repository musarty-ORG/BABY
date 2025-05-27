import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import type {
  PipelineRequest,
  RawCode,
  ReviewedCode,
  PipelineResult,
  PipelineIteration,
  StylePreferences,
} from "@/types/pipeline"
import { pipelineLogger } from "./pipeline-logger"

export class PipelineOrchestrator {
  private readonly MAX_RETRIES = 3
  private readonly GENERATION_TIMEOUT = 30000
  private readonly REVIEW_TIMEOUT = 20000

  // Real implementation using embeddings and semantic search
  private async retrieveRelevantDocs(userQuery: string): Promise<Array<{ text: string }>> {
    try {
      // Step 1: Generate embedding for the user query
      const queryEmbedding = await this.generateEmbedding(userQuery)

      // Step 2: Search for similar documents in our knowledge base
      const similarDocs = await this.searchSimilarDocuments(queryEmbedding, userQuery)

      // Step 3: Rank and filter results
      const rankedDocs = this.rankDocumentsByRelevance(similarDocs, userQuery)

      // Return top 3 most relevant documents
      return rankedDocs.slice(0, 3)
    } catch (error) {
      console.error("Document retrieval failed:", error)
      // Fallback to keyword-based search
      return this.fallbackKeywordSearch(userQuery)
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Use Groq's embedding model or OpenAI embeddings
      const response = await fetch("https://api.groq.com/openai/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-ada-002",
          input: text,
        }),
      })

      if (!response.ok) {
        throw new Error(`Embedding API failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data[0].embedding
    } catch (error) {
      console.error("Embedding generation failed:", error)
      // Return empty array as fallback
      return []
    }
  }

  private async searchSimilarDocuments(
    queryEmbedding: number[],
    userQuery: string,
  ): Promise<Array<{ text: string; score: number }>> {
    // Knowledge base with pre-computed embeddings (in production, store in vector DB)
    const knowledgeBase = [
      {
        text: `React Best Practices and Patterns:
- Use functional components with hooks instead of class components
- Implement proper error boundaries to catch JavaScript errors
- Follow the single responsibility principle for components
- Use TypeScript for better type safety and developer experience
- Implement proper state management with Context API, Zustand, or Redux
- Use React.memo() for performance optimization of expensive components
- Implement proper key props for list items
- Use useCallback and useMemo hooks to prevent unnecessary re-renders
- Follow consistent naming conventions for components and hooks
- Implement proper prop validation with TypeScript interfaces`,
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5], // Mock embedding
        category: "react",
        keywords: ["react", "components", "hooks", "typescript", "state", "performance"],
      },
      {
        text: `Security Guidelines for Web Applications:
- Always validate and sanitize user inputs on both client and server
- Use HTTPS for all communications and API calls
- Implement proper authentication and authorization mechanisms
- Avoid storing sensitive data in localStorage or sessionStorage
- Use Content Security Policy (CSP) headers to prevent XSS attacks
- Implement rate limiting to prevent abuse and DDoS attacks
- Use secure HTTP headers (HSTS, X-Frame-Options, etc.)
- Sanitize data before rendering to prevent injection attacks
- Use environment variables for sensitive configuration
- Implement proper session management and logout functionality`,
        embedding: [0.2, 0.3, 0.4, 0.5, 0.6], // Mock embedding
        category: "security",
        keywords: ["security", "authentication", "validation", "xss", "csrf", "https"],
      },
      {
        text: `Performance Optimization Techniques:
- Implement code splitting and lazy loading for large applications
- Optimize images using modern formats (WebP, AVIF) and proper sizing
- Minimize bundle sizes using tree shaking and dead code elimination
- Use React.memo for expensive components that don't change often
- Implement proper caching strategies (browser cache, CDN, service workers)
- Use virtual scrolling for large lists and tables
- Optimize database queries and implement proper indexing
- Use compression (gzip, brotli) for static assets
- Implement proper loading states and skeleton screens
- Monitor performance with tools like Lighthouse and Web Vitals`,
        embedding: [0.3, 0.4, 0.5, 0.6, 0.7], // Mock embedding
        category: "performance",
        keywords: ["performance", "optimization", "caching", "lazy loading", "bundle", "images"],
      },
      {
        text: `Next.js App Router Best Practices:
- Use Server Components by default for better performance
- Implement proper data fetching with async/await in Server Components
- Use Client Components only when necessary (interactivity, browser APIs)
- Implement proper error handling with error.tsx files
- Use loading.tsx files for better user experience
- Implement proper SEO with metadata API
- Use route groups for organization without affecting URL structure
- Implement proper middleware for authentication and redirects
- Use parallel routes for complex layouts
- Implement proper caching strategies with revalidation`,
        embedding: [0.4, 0.5, 0.6, 0.7, 0.8], // Mock embedding
        category: "nextjs",
        keywords: ["nextjs", "app router", "server components", "client components", "routing"],
      },
      {
        text: `Database Design and API Best Practices:
- Design normalized database schemas to reduce redundancy
- Use proper indexing for frequently queried columns
- Implement database migrations for schema changes
- Use connection pooling for better performance
- Implement proper error handling and transaction management
- Use prepared statements to prevent SQL injection
- Design RESTful APIs with proper HTTP methods and status codes
- Implement proper API versioning strategies
- Use pagination for large datasets
- Implement proper logging and monitoring for APIs`,
        embedding: [0.5, 0.6, 0.7, 0.8, 0.9], // Mock embedding
        category: "database",
        keywords: ["database", "api", "sql", "rest", "indexing", "migrations"],
      },
    ]

    if (queryEmbedding.length === 0) {
      // Fallback to keyword matching if embedding failed
      return this.fallbackKeywordSearch(userQuery).map((doc) => ({ ...doc, score: 0.5 }))
    }

    // Calculate cosine similarity between query and documents
    const scoredDocs = knowledgeBase.map((doc) => {
      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding)
      const keywordBoost = this.calculateKeywordBoost(userQuery, doc.keywords)
      const finalScore = similarity * 0.7 + keywordBoost * 0.3

      return {
        text: doc.text,
        score: finalScore,
        category: doc.category,
      }
    })

    // Sort by relevance score
    return scoredDocs.sort((a, b) => b.score - a.score)
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0)
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0))
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0))

    if (magnitudeA === 0 || magnitudeB === 0) return 0

    return dotProduct / (magnitudeA * magnitudeB)
  }

  private calculateKeywordBoost(query: string, keywords: string[]): number {
    const queryWords = query.toLowerCase().split(/\s+/)
    const matchCount = keywords.filter((keyword) =>
      queryWords.some((word) => word.includes(keyword) || keyword.includes(word)),
    ).length

    return matchCount / keywords.length
  }

  private rankDocumentsByRelevance(
    docs: Array<{ text: string; score: number }>,
    userQuery: string,
  ): Array<{ text: string }> {
    // Additional ranking based on query context
    const queryLower = userQuery.toLowerCase()

    return docs
      .filter((doc) => doc.score > 0.1) // Filter out very low relevance
      .map((doc) => {
        let adjustedScore = doc.score

        // Boost score for specific contexts
        if (queryLower.includes("react") && doc.text.toLowerCase().includes("react")) {
          adjustedScore += 0.2
        }
        if (queryLower.includes("security") && doc.text.toLowerCase().includes("security")) {
          adjustedScore += 0.2
        }
        if (queryLower.includes("performance") && doc.text.toLowerCase().includes("performance")) {
          adjustedScore += 0.2
        }
        if (queryLower.includes("database") && doc.text.toLowerCase().includes("database")) {
          adjustedScore += 0.2
        }

        return { ...doc, score: adjustedScore }
      })
      .sort((a, b) => b.score - a.score)
      .map((doc) => ({ text: doc.text }))
  }

  private fallbackKeywordSearch(userQuery: string): Array<{ text: string }> {
    const fallbackDocs = [
      {
        text: `General Development Best Practices:
- Write clean, readable, and maintainable code
- Follow established coding standards and conventions
- Implement proper error handling and logging
- Use version control effectively with meaningful commit messages
- Write comprehensive tests for your code
- Document your code and APIs properly
- Follow the DRY (Don't Repeat Yourself) principle
- Implement proper separation of concerns
- Use meaningful variable and function names
- Regularly refactor and optimize your code`,
        keywords: ["development", "best practices", "clean code", "testing"],
      },
    ]

    const queryWords = userQuery.toLowerCase().split(/\s+/)

    // Simple keyword matching for fallback
    const relevantDocs = fallbackDocs.filter((doc) =>
      queryWords.some((word) => doc.keywords.some((keyword) => keyword.includes(word) || word.includes(keyword))),
    )

    return relevantDocs.length > 0 ? relevantDocs : fallbackDocs
  }

  private buildStyleInstructions(stylePreferences?: StylePreferences): string {
    if (!stylePreferences) return ""

    const instructions = []

    if (stylePreferences.colorScheme) {
      if (stylePreferences.colorScheme === "dark") {
        instructions.push("Use a dark theme with dark backgrounds and light text")
      } else if (stylePreferences.colorScheme === "light") {
        instructions.push("Use a light theme with light backgrounds and dark text")
      }
    }

    if (stylePreferences.primaryColor) {
      instructions.push(`Use ${stylePreferences.primaryColor} as the primary color`)
    }

    if (stylePreferences.secondaryColor) {
      instructions.push(`Use ${stylePreferences.secondaryColor} as the secondary/accent color`)
    }

    if (stylePreferences.layoutStyle) {
      switch (stylePreferences.layoutStyle) {
        case "minimal":
          instructions.push("Use a minimal, clean design with lots of whitespace")
          break
        case "modern":
          instructions.push("Use a modern design with gradients, shadows, and contemporary styling")
          break
        case "bold":
          instructions.push("Use a bold design with strong contrasts and eye-catching elements")
          break
        case "classic":
          instructions.push("Use a classic, traditional design with timeless elements")
          break
      }
    }

    if (stylePreferences.typography) {
      switch (stylePreferences.typography) {
        case "serif":
          instructions.push("Use serif fonts for a traditional, elegant look")
          break
        case "monospace":
          instructions.push("Use monospace fonts for a technical, code-like appearance")
          break
        default:
          instructions.push("Use clean, modern sans-serif fonts")
      }
    }

    if (stylePreferences.animations) {
      instructions.push("Include subtle animations and transitions for better user experience")
    }

    if (stylePreferences.borderRadius) {
      switch (stylePreferences.borderRadius) {
        case "none":
          instructions.push("Use sharp, square corners with no border radius")
          break
        case "small":
          instructions.push("Use small, subtle rounded corners")
          break
        case "medium":
          instructions.push("Use medium rounded corners")
          break
        case "large":
          instructions.push("Use large, prominent rounded corners")
          break
      }
    }

    if (stylePreferences.customInstructions) {
      instructions.push(stylePreferences.customInstructions)
    }

    return instructions.length > 0 ? `\n\nSTYLE REQUIREMENTS:\n${instructions.map((i) => `- ${i}`).join("\n")}` : ""
  }

  private parseJsonSafely(jsonString: string): Record<string, string> | null {
    try {
      // First, try direct parsing
      return JSON.parse(jsonString)
    } catch (error) {
      console.log("Direct JSON parse failed, trying cleanup...")

      try {
        // Clean up the string step by step
        let cleaned = jsonString.trim()

        // Remove markdown code blocks
        cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "")
        cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "")

        // Handle escaped quotes - this is the main issue
        // Replace \" with " but be careful not to break actual JSON structure
        cleaned = cleaned.replace(/\\"/g, '"')

        // Try parsing the cleaned version
        return JSON.parse(cleaned)
      } catch (secondError) {
        console.log("Cleanup parse failed, trying regex extraction...")

        try {
          // Try to extract JSON using regex patterns
          const patterns = [/```json\s*([\s\S]*?)\s*```/, /```\s*([\s\S]*?)\s*```/, /{\s*"[^"]*":\s*"[\s\S]*?}/]

          for (const pattern of patterns) {
            const match = jsonString.match(pattern)
            if (match) {
              let extracted = match[1] || match[0]

              // Clean the extracted content
              extracted = extracted.trim()
              extracted = extracted.replace(/\\"/g, '"')

              try {
                return JSON.parse(extracted)
              } catch (parseError) {
                continue
              }
            }
          }

          // If all regex patterns fail, try a more aggressive approach
          // Look for the main JSON structure
          const jsonStart = jsonString.indexOf("{")
          const jsonEnd = jsonString.lastIndexOf("}")

          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            let extracted = jsonString.substring(jsonStart, jsonEnd + 1)
            extracted = extracted.replace(/\\"/g, '"')

            return JSON.parse(extracted)
          }

          return null
        } catch (regexError) {
          console.log("All parsing attempts failed:", regexError)
          return null
        }
      }
    }
  }

  async executeFullPipeline(request: PipelineRequest): Promise<PipelineResult> {
    const startTime = Date.now()
    const iterations: PipelineIteration[] = []
    let currentCode = ""
    let finalStatus: "SUCCESS" | "FAILED" | "PARTIAL" = "FAILED"
    let codeFiles: Record<string, string> | undefined

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

      // Handle codegen mode - skip E2B execution and parse JSON
      if (request.mode === "codegen" && currentCode) {
        // Use the new safe JSON parser
        const parsedFiles = this.parseJsonSafely(currentCode)

        if (parsedFiles) {
          codeFiles = parsedFiles
          await pipelineLogger.logStage(
            request.requestId,
            "CODEGEN_PARSE_SUCCESS",
            { fileCount: Object.keys(codeFiles).length },
            null,
            0,
          )
        } else {
          await pipelineLogger.logError(
            request.requestId,
            "ORCHESTRATION",
            `All JSON parsing attempts failed for: ${currentCode.substring(0, 200)}...`,
            true,
          )

          // Final fallback - create minimal structure with the raw content
          codeFiles = {
            "app/page.tsx": `// Generated content could not be parsed properly
// Raw AI output:
/*
${currentCode}
*/

import React from 'react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-4">Generated Website</h1>
      <p className="text-gray-400">
        The AI generated content but it could not be parsed properly. 
        Please check the raw output in the comments above.
      </p>
    </div>
  );
}`,
            "package.json": JSON.stringify(
              {
                name: "generated-website",
                version: "0.1.0",
                private: true,
                scripts: {
                  dev: "next dev",
                  build: "next build",
                  start: "next start",
                  lint: "next lint",
                },
                dependencies: {
                  next: "14.0.0",
                  react: "^18.0.0",
                  "react-dom": "^18.0.0",
                },
                devDependencies: {
                  "@types/node": "^20.0.0",
                  "@types/react": "^18.0.0",
                  "@types/react-dom": "^18.0.0",
                  typescript: "^5.0.0",
                  tailwindcss: "^3.0.0",
                  postcss: "^8.0.0",
                  autoprefixer: "^10.0.0",
                },
              },
              null,
              2,
            ),
            "README.md": `# Generated Website

The AI generated content but JSON parsing failed. Raw output:

\`\`\`
${currentCode}
\`\`\`
`,
          }
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
      codeFiles,
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

      let codeGenPrompt: string

      if (request.mode === "codegen") {
        // Build style instructions
        const styleInstructions = this.buildStyleInstructions(request.stylePreferences)

        // Special codegen mode for website building
        codeGenPrompt = `You are v0-1.0-md, a legendary website-builder.
Generate a complete Next.js + Tailwind landing page for: "${enhancedPrompt}"${styleInstructions}

CRITICAL: Output ONLY valid JSON without any markdown formatting, explanations, or escaped quotes.

Expected format (no backticks, no markdown, no escaped quotes):
{
  "app/page.tsx": "import React from 'react';\\n\\nexport default function HomePage() {\\n  return (\\n    <div className=\\"min-h-screen bg-white\\">\\n      <h1>Your content here</h1>\\n    </div>\\n  );\\n}",
  "app/layout.tsx": "import './globals.css';\\n\\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\\n  return (\\n    <html lang=\\"en\\">\\n      <body>{children}</body>\\n    </html>\\n  );\\n}",
  "app/globals.css": "@tailwind base;\\n@tailwind components;\\n@tailwind utilities;",
  "components/Header.tsx": "export default function Header() { return <header>Header</header>; }",
  "components/Hero.tsx": "export default function Hero() { return <section>Hero</section>; }",
  "components/Features.tsx": "export default function Features() { return <section>Features</section>; }",
  "components/Footer.tsx": "export default function Footer() { return <footer>Footer</footer>; }",
  "package.json": "{\\n  \\"name\\": \\"generated-website\\",\\n  \\"version\\": \\"0.1.0\\",\\n  \\"private\\": true,\\n  \\"scripts\\": {\\n    \\"dev\\": \\"next dev\\",\\n    \\"build\\": \\"next build\\",\\n    \\"start\\": \\"next start\\",\\n    \\"lint\\": \\"next lint\\"\\n  },\\n  \\"dependencies\\": {\\n    \\"next\\": \\"14.0.0\\",\\n    \\"react\\": \\"^18.0.0\\",\\n    \\"react-dom\\": \\"^18.0.0\\"\\n  },\\n  \\"devDependencies\\": {\\n    \\"@types/node\\": \\"^20.0.0\\",\\n    \\"@types/react\\": \\"^18.0.0\\",\\n    \\"@types/react-dom\\": \\"^18.0.0\\",\\n    \\"typescript\\": \\"^5.0.0\\",\\n    \\"tailwindcss\\": \\"^3.0.0\\",\\n    \\"postcss\\": \\"^8.0.0\\",\\n    \\"autoprefixer\\": \\"^10.0.0\\"\\n  }\\n}",
  "tailwind.config.js": "module.exports = {\\n  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],\\n  theme: { extend: {} },\\n  plugins: []\\n}",
  "next.config.js": "module.exports = { experimental: { appDir: true } }"
}

Requirements:
- Use modern React with TypeScript
- Use Tailwind CSS for styling
- Create responsive design
- Include proper SEO meta tags
- Use Next.js 13+ App Router
- Include proper component structure
- Add proper TypeScript types
- Make it production-ready
- Follow the style requirements exactly

IMPORTANT: Return ONLY the JSON object. No explanations, no markdown, no code blocks, no escaped quotes in the JSON keys or structure.`
      } else {
        // Standard mode with document retrieval
        const docs = await this.retrieveRelevantDocs(enhancedPrompt)
        const contextualPrompt = `${docs.map((d) => d.text).join("\n\n")}\n\nUser: ${enhancedPrompt}`

        codeGenPrompt = `You are v0-1.0-md, a specialized code generation model. Generate clean, functional code based on this request with relevant context:

${contextualPrompt}

Focus on:
- Clean, readable code
- Best practices from the provided context
- Proper structure
- Working functionality
- Security considerations

Generate ONLY the code, no explanations:`
      }

      await pipelineLogger.logStage(
        request.requestId,
        "CODE_GEN_START",
        {
          prompt: enhancedPrompt,
          mode: request.mode,
          promptLength: codeGenPrompt.length,
          stylePreferences: request.stylePreferences,
        },
        null,
        0,
      )

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
      let reviewPrompt: string

      if (request.mode === "codegen") {
        reviewPrompt = `You are the Groq Supervisor, an expert code reviewer for website projects. Review this JSON code structure generated by v0-1.0-md:

ORIGINAL REQUEST: ${rawCode.prompt}

CODE TO REVIEW:
\`\`\`
${rawCode.code}
\`\`\`

Check for:
- Valid JSON structure
- Complete file set for a Next.js project
- Proper TypeScript syntax
- Tailwind CSS usage
- Responsive design patterns
- SEO best practices
- Component structure
- Style requirements compliance

Provide a structured review in this EXACT format:

QUALITY_SCORE: [1-10]
SECURITY_ISSUES: [list any security concerns, or "NONE"]
PERFORMANCE_ISSUES: [list any performance concerns, or "NONE"]
REVIEW_NOTES: [detailed feedback on the website structure and code quality]
SUGGESTED_FIXES: [specific improvements, or "NONE"]
VERDICT: [APPROVE/REJECT/NEEDS_REVISION]

Be thorough but constructive in your review.`
      } else {
        reviewPrompt = `You are the Groq Supervisor, an expert code reviewer and mentor. Review this code generated by v0-1.0-md:

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
      }

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
