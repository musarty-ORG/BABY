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
import { searchEngine } from "./search-engine"

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
    // Updated knowledge base for 2025 standards
    const knowledgeBase = [
      {
        text: `Modern Development Patterns 2025:
- Use React 19+ with concurrent features and automatic batching
- Implement Server Components and streaming SSR for optimal performance
- Use TypeScript 5.5+ with latest type inference improvements
- Leverage Web Components and custom elements for framework-agnostic solutions
- Implement micro-frontends with Module Federation or single-spa
- Use Vite 6+ or Turbopack for ultra-fast development builds
- Adopt CSS Container Queries and modern layout techniques
- Implement Progressive Web Apps with latest service worker patterns
- Use WebAssembly for performance-critical computations
- Leverage Edge Computing and serverless functions at the edge`,
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        category: "modern-dev",
        keywords: ["react", "typescript", "vite", "webassembly", "pwa", "edge", "2025"],
      },
      {
        text: `Security Best Practices 2025:
- Implement Zero Trust Architecture with continuous verification
- Use Content Security Policy Level 3 with strict-dynamic
- Adopt Passkeys and WebAuthn for passwordless authentication
- Implement Supply Chain Security with SLSA framework
- Use OWASP Top 10 2025 guidelines for web application security
- Leverage Security Headers with latest recommendations
- Implement Runtime Application Self-Protection (RASP)
- Use AI-powered threat detection and response systems
- Adopt Privacy-by-Design principles with data minimization
- Implement Quantum-resistant cryptography preparation`,
        embedding: [0.2, 0.3, 0.4, 0.5, 0.6],
        category: "security-2025",
        keywords: ["security", "zero-trust", "webauthn", "owasp", "quantum", "privacy", "2025"],
      },
      {
        text: `Performance Optimization 2025:
- Use Core Web Vitals 2025 metrics (INP, CLS, LCP improvements)
- Implement Streaming SSR with React 19 concurrent features
- Leverage HTTP/3 and QUIC protocol optimizations
- Use Advanced Image Formats (AVIF, WebP, JPEG XL)
- Implement Predictive Prefetching with ML algorithms
- Use Service Workers with Background Sync and Push API
- Leverage WebCodecs API for media processing
- Implement Virtual DOM alternatives like Solid.js patterns
- Use Web Streams API for efficient data processing
- Adopt Edge-Side Includes (ESI) for dynamic content`,
        embedding: [0.3, 0.4, 0.5, 0.6, 0.7],
        category: "performance-2025",
        keywords: ["performance", "web-vitals", "http3", "streaming", "webcodecs", "edge", "2025"],
      },
      {
        text: `Full-Stack Development 2025:
- Use Next.js 15+ with Turbopack and enhanced App Router
- Implement tRPC or GraphQL with real-time subscriptions
- Use Prisma 6+ with edge database support
- Leverage Serverless databases (PlanetScale, Neon, Supabase)
- Implement Event-Driven Architecture with message queues
- Use Docker containers with multi-stage builds
- Adopt Infrastructure as Code with Terraform or Pulumi
- Implement CI/CD with GitHub Actions and automated testing
- Use Monitoring with OpenTelemetry and distributed tracing
- Leverage AI/ML integration with TensorFlow.js or ONNX`,
        embedding: [0.4, 0.5, 0.6, 0.7, 0.8],
        category: "fullstack-2025",
        keywords: ["nextjs", "trpc", "prisma", "serverless", "docker", "ai", "ml", "2025"],
      },
      {
        text: `Multi-Platform Development 2025:
- Use React Native 0.75+ with New Architecture and Fabric
- Implement Flutter 3.24+ with Impeller rendering engine
- Use Tauri 2.0 for lightweight desktop applications
- Leverage Electron alternatives like Wails or Neutralino
- Implement Progressive Web Apps with advanced capabilities
- Use Capacitor for hybrid mobile development
- Adopt WebAssembly for cross-platform native performance
- Implement Universal Apps with Expo Router and file-based routing
- Use Kotlin Multiplatform for shared business logic
- Leverage .NET MAUI for Microsoft ecosystem integration`,
        embedding: [0.5, 0.6, 0.7, 0.8, 0.9],
        category: "multiplatform-2025",
        keywords: ["react-native", "flutter", "tauri", "electron", "pwa", "webassembly", "kotlin", "2025"],
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

        // Boost score for specific contexts in 2025
        if (queryLower.includes("react") && doc.text.toLowerCase().includes("react")) {
          adjustedScore += 0.2
        }
        if (queryLower.includes("security") && doc.text.toLowerCase().includes("security")) {
          adjustedScore += 0.2
        }
        if (queryLower.includes("performance") && doc.text.toLowerCase().includes("performance")) {
          adjustedScore += 0.2
        }
        if (queryLower.includes("ai") || queryLower.includes("ml")) {
          adjustedScore += 0.2
        }
        if (queryLower.includes("mobile") || queryLower.includes("native")) {
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
        text: `Universal Development Best Practices 2025:
- Write clean, readable, and maintainable code across all platforms
- Follow established coding standards and conventions for each technology
- Implement proper error handling and comprehensive logging
- Use version control effectively with meaningful commit messages
- Write comprehensive tests for your code (unit, integration, e2e)
- Document your code and APIs properly with modern tools
- Follow the DRY (Don't Repeat Yourself) principle
- Implement proper separation of concerns and modular architecture
- Use meaningful variable and function names with clear intent
- Regularly refactor and optimize your code for 2025 standards`,
        keywords: ["development", "best practices", "clean code", "testing", "2025"],
      },
    ]

    const queryWords = userQuery.toLowerCase().split(/\s+/)

    // Simple keyword matching for fallback
    const relevantDocs = fallbackDocs.filter((doc) =>
      queryWords.some((word) => doc.keywords.some((keyword) => keyword.includes(word) || word.includes(keyword))),
    )

    return relevantDocs.length > 0 ? relevantDocs : fallbackDocs
  }

  private async searchRealTimeKnowledge(query: string, codeContext?: string): Promise<string> {
    // Check if search is available
    if (!process.env.TAVILY_API_KEY) {
      console.warn("Tavily API key not available, using fallback knowledge")
      return ""
    }

    try {
      // Create search queries based on the request with 2025 context
      const searchQueries = this.generateSearchQueries(query, codeContext)

      const searchResults = await Promise.all(
        searchQueries.map(async (searchQuery) => {
          try {
            const result = await searchEngine.search(searchQuery, {
              includeAnswer: true,
              maxResults: 8, // Increased for better knowledge coverage
              searchDepth: "advanced", // Use advanced for better relevance
              includeRawContent: false, // Don't need raw content for knowledge gathering
              includeDomains: [
                "github.com",
                "stackoverflow.com",
                "nextjs.org",
                "react.dev",
                "developer.mozilla.org",
                "web.dev", // Google's web development best practices
                "css-tricks.com", // CSS and frontend tips
                "smashingmagazine.com", // Design and development insights
              ],
              topic: "general",
            })
            return result
          } catch (error) {
            console.warn(`Search failed for query: ${searchQuery}`, error)
            return null
          }
        }),
      )

      // Combine and format search results
      const validResults = searchResults.filter((result) => result !== null)
      if (validResults.length === 0) return ""

      let knowledgeContext = "\n\n=== REAL-TIME KNOWLEDGE (May 2025) ===\n"

      validResults.forEach((result, index) => {
        if (result.answer) {
          knowledgeContext += `\nSEARCH ANSWER ${index + 1}: ${result.answer}\n`
        }

        knowledgeContext += `\nRELEVANT RESOURCES ${index + 1}:\n`
        result.results.slice(0, 3).forEach((item, itemIndex) => {
          knowledgeContext += `${itemIndex + 1}. ${item.title}\n   ${item.content.substring(0, 200)}...\n   Source: ${item.url}\n\n`
        })
      })

      knowledgeContext += "=== END REAL-TIME KNOWLEDGE ===\n\n"
      return knowledgeContext
    } catch (error) {
      console.error("Real-time knowledge search failed:", error)
      return ""
    }
  }

  private generateSearchQueries(userQuery: string, codeContext?: string): string[] {
    // Extract key concepts and create focused sub-queries under 400 chars
    const extractKeyTerms = (text: string): string[] => {
      const words = text.toLowerCase().split(/\s+/)
      const stopWords = new Set([
        "and",
        "or",
        "the",
        "a",
        "an",
        "in",
        "on",
        "at",
        "to",
        "for",
        "with",
        "by",
        "about",
        "like",
        "how",
        "what",
        "when",
        "where",
        "why",
        "create",
        "build",
        "make",
        "develop",
        "implement",
        "generate",
        "design",
        "write",
        "website",
        "landing",
        "page",
      ])

      return words.filter((word) => word.length > 2 && !stopWords.has(word)).slice(0, 2) // Only top 2 key terms
    }

    const keyTerms = extractKeyTerms(userQuery)
    const promptLower = userQuery.toLowerCase()
    const queries: string[] = []

    // Strategy: Create very focused, short queries for better AI knowledge retrieval

    // 1. Technology-specific best practices (under 50 chars each)
    if (promptLower.includes("react")) {
      queries.push(`React 19 best practices 2025`)
      queries.push(`React components modern patterns`)
    } else if (promptLower.includes("vue")) {
      queries.push(`Vue 3.4 composition API patterns`)
    } else if (promptLower.includes("next")) {
      queries.push(`Next.js 15 app router guide`)
      queries.push(`Next.js performance optimization`)
    } else if (promptLower.includes("flutter")) {
      queries.push(`Flutter 3.24 best practices`)
    } else if (promptLower.includes("python")) {
      queries.push(`Python 3.13 modern development`)
    } else {
      // Generic web development query
      queries.push(`${keyTerms[0]} web development 2025`)
    }

    // 2. Implementation examples (focused on code quality)
    if (keyTerms.length > 0) {
      queries.push(`${keyTerms[0]} code examples GitHub`)
    }

    // 3. Performance and security (if relevant)
    if (promptLower.includes("performance") || promptLower.includes("fast") || promptLower.includes("speed")) {
      queries.push(`web performance optimization 2025`)
    }

    if (promptLower.includes("secure") || promptLower.includes("auth") || promptLower.includes("login")) {
      queries.push(`web security best practices 2025`)
    }

    // 4. UI/UX specific queries for landing pages
    if (promptLower.includes("landing") || promptLower.includes("homepage") || promptLower.includes("website")) {
      queries.push(`modern landing page design trends`)
      queries.push(`website UI best practices 2025`)
    }

    // Ensure all queries are under 400 characters and limit to 3 for efficiency
    return queries.map((query) => (query.length > 400 ? query.substring(0, 397) + "..." : query)).slice(0, 3)
  }

  private detectProjectType(prompt: string): string {
    const promptLower = prompt.toLowerCase()

    // Web frameworks
    if (promptLower.includes("react") || promptLower.includes("jsx")) return "react"
    if (promptLower.includes("vue")) return "vue"
    if (promptLower.includes("angular")) return "angular"
    if (promptLower.includes("svelte")) return "svelte"
    if (promptLower.includes("solid")) return "solid"
    if (promptLower.includes("next")) return "nextjs"
    if (promptLower.includes("nuxt")) return "nuxt"
    if (promptLower.includes("astro")) return "astro"
    if (promptLower.includes("remix")) return "remix"

    // Mobile frameworks
    if (promptLower.includes("flutter")) return "flutter"
    if (promptLower.includes("react native")) return "react-native"
    if (promptLower.includes("ionic")) return "ionic"
    if (promptLower.includes("capacitor")) return "capacitor"

    // Desktop frameworks
    if (promptLower.includes("tauri")) return "tauri"
    if (promptLower.includes("electron")) return "electron"
    if (promptLower.includes("wails")) return "wails"

    // Backend frameworks
    if (promptLower.includes("express")) return "express"
    if (promptLower.includes("fastify")) return "fastify"
    if (promptLower.includes("nest")) return "nestjs"
    if (promptLower.includes("django")) return "django"
    if (promptLower.includes("flask")) return "flask"
    if (promptLower.includes("fastapi")) return "fastapi"
    if (promptLower.includes("spring")) return "spring"
    if (promptLower.includes("gin") || promptLower.includes("fiber")) return "go"
    if (promptLower.includes("actix") || promptLower.includes("axum")) return "rust"

    // Languages
    if (promptLower.includes("python")) return "python"
    if (promptLower.includes("rust")) return "rust"
    if (promptLower.includes("go") || promptLower.includes("golang")) return "go"
    if (promptLower.includes("java")) return "java"
    if (promptLower.includes("c#") || promptLower.includes("csharp")) return "csharp"
    if (promptLower.includes("php")) return "php"
    if (promptLower.includes("ruby")) return "ruby"

    // Default to web if website/landing page mentioned
    if (promptLower.includes("website") || promptLower.includes("landing")) return "nextjs"

    return "generic"
  }

  private generateProjectStructure(projectType: string, prompt: string): Record<string, string> {
    const structures: Record<string, () => Record<string, string>> = {
      react: () => ({
        "src/App.tsx": `import React from 'react';\nimport './App.css';\n\nfunction App() {\n  return (\n    <div className="App">\n      <h1>React App</h1>\n    </div>\n  );\n}\n\nexport default App;`,
        "src/index.tsx": `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nconst root = ReactDOM.createRoot(document.getElementById('root')!);\nroot.render(<App />);`,
        "package.json": JSON.stringify(
          {
            name: "react-app",
            version: "0.1.0",
            dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
            devDependencies: { "@types/react": "^19.0.0", typescript: "^5.5.0", vite: "^6.0.0" },
          },
          null,
          2,
        ),
      }),

      vue: () => ({
        "src/App.vue": `<template>\n  <div id="app">\n    <h1>Vue App</h1>\n  </div>\n</template>\n\n<script setup lang="ts">\n// Vue 3.4+ Composition API\n</script>`,
        "src/main.ts": `import { createApp } from 'vue';\nimport App from './App.vue';\n\ncreateApp(App).mount('#app');`,
        "package.json": JSON.stringify(
          {
            name: "vue-app",
            version: "0.1.0",
            dependencies: { vue: "^3.4.0" },
            devDependencies: { "@vitejs/plugin-vue": "^5.0.0", typescript: "^5.5.0", vite: "^6.0.0" },
          },
          null,
          2,
        ),
      }),

      flutter: () => ({
        "lib/main.dart": `import 'package:flutter/material.dart';\n\nvoid main() {\n  runApp(MyApp());\n}\n\nclass MyApp extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return MaterialApp(\n      title: 'Flutter App',\n      home: Scaffold(\n        appBar: AppBar(title: Text('Flutter App')),\n        body: Center(child: Text('Hello Flutter!')),\n      ),\n    );\n  }\n}`,
        "pubspec.yaml": `name: flutter_app\nversion: 1.0.0+1\nenvironment:\n  sdk: '>=3.4.0 <4.0.0'\n  flutter: ">=3.24.0"\ndependencies:\n  flutter:\n    sdk: flutter\ndev_dependencies:\n  flutter_test:\n    sdk: flutter`,
      }),

      python: () => ({
        "main.py": `#!/usr/bin/env python3\n"""Main application module."""\n\ndef main():\n    \"\"\"Main function.\"\"\"\n    print("Hello, Python!")\n\nif __name__ == "__main__":\n    main()`,
        "requirements.txt": "# Add your dependencies here\n",
        "pyproject.toml": `[build-system]\nrequires = ["setuptools>=61.0"]\nbuild-backend = "setuptools.build_meta"\n\n[project]\nname = "python-app"\nversion = "0.1.0"\ndescription = "A Python application"\nrequires-python = ">=3.11"`,
      }),

      rust: () => ({
        "src/main.rs": `fn main() {\n    println!("Hello, Rust!");\n}`,
        "Cargo.toml": `[package]\nname = "rust-app"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]`,
      }),

      go: () => ({
        "main.go": `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, Go!")\n}`,
        "go.mod": `module go-app\n\ngo 1.22\n`,
      }),
    }

    return structures[projectType]?.() || structures.react()
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

      // Handle codegen mode - detect project type and parse accordingly
      if (request.mode === "codegen" && currentCode) {
        const projectType = this.detectProjectType(request.prompt)

        // Try to parse as JSON first (for web projects)
        const parsedFiles = this.parseJsonSafely(currentCode)

        if (parsedFiles) {
          codeFiles = parsedFiles
          await pipelineLogger.logStage(
            request.requestId,
            "CODEGEN_PARSE_SUCCESS",
            { fileCount: Object.keys(codeFiles).length, projectType },
            null,
            0,
          )
        } else {
          // If JSON parsing fails, create appropriate project structure
          await pipelineLogger.logError(
            request.requestId,
            "ORCHESTRATION",
            `JSON parsing failed, creating ${projectType} project structure`,
            true,
          )

          const baseStructure = this.generateProjectStructure(projectType, request.prompt)

          // Add the generated code to the main file
          const mainFile = Object.keys(baseStructure)[0]
          baseStructure[mainFile] = currentCode

          codeFiles = {
            ...baseStructure,
            "README.md": `# Generated ${projectType.toUpperCase()} Project

Generated on: ${new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}

## Original Request
${request.prompt}

## Project Type
${projectType}

## Generated Code
The main code has been placed in ${mainFile}

## Setup Instructions
${this.getSetupInstructions(projectType)}

Generated by NEXUS AI Pipeline v2.0 (May 2025)
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

  private getSetupInstructions(projectType: string): string {
    const instructions: Record<string, string> = {
      react: "1. Run `npm install`\n2. Run `npm run dev`\n3. Open http://localhost:5173",
      vue: "1. Run `npm install`\n2. Run `npm run dev`\n3. Open http://localhost:5173",
      nextjs: "1. Run `npm install`\n2. Run `npm run dev`\n3. Open http://localhost:3000",
      flutter: "1. Run `flutter pub get`\n2. Run `flutter run`\n3. Choose your target device",
      python:
        "1. Create virtual environment: `python -m venv venv`\n2. Activate: `source venv/bin/activate`\n3. Install deps: `pip install -r requirements.txt`\n4. Run: `python main.py`",
      rust: "1. Run `cargo build`\n2. Run `cargo run`",
      go: "1. Run `go mod tidy`\n2. Run `go run main.go`",
    }

    return instructions[projectType] || "Follow the standard setup process for this project type."
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

      // Get real-time knowledge with 2025 context
      const realTimeKnowledge = await this.searchRealTimeKnowledge(enhancedPrompt, previousCode)

      // Detect project type for appropriate generation
      const projectType = this.detectProjectType(enhancedPrompt)

      let codeGenPrompt: string

      if (request.mode === "codegen") {
        // Build style instructions
        const styleInstructions = this.buildStyleInstructions(request.stylePreferences)

        // Special codegen mode for any project type with real-time knowledge
        codeGenPrompt = `You are v0-1.0-md, a legendary multi-platform developer with access to real-time knowledge from May 2025.

${realTimeKnowledge}

Generate a complete ${projectType} project for: "${enhancedPrompt}"${styleInstructions}

Project Type Detected: ${projectType}

Use the real-time knowledge above to:
- Implement modern, up-to-date patterns for ${projectType} in 2025
- Follow current best practices from May 2025
- Use the latest framework features and optimizations
- Incorporate modern design trends and performance optimizations
- Apply security and accessibility standards from 2025

CRITICAL: Output ONLY valid JSON without any markdown formatting, explanations, or escaped quotes.

For web projects (React/Next.js/Vue/etc), use this format:
{
  "src/main.ext": "code here",
  "package.json": "package config",
  "README.md": "setup instructions"
}

For mobile projects (Flutter/React Native), use:
{
  "lib/main.dart": "Flutter code" OR "src/App.tsx": "React Native code",
  "pubspec.yaml": "Flutter config" OR "package.json": "RN config"
}

For desktop projects (Tauri/Electron), use:
{
  "src/main.rs": "Rust code" OR "src/main.ts": "Electron code",
  "Cargo.toml": "Rust config" OR "package.json": "Electron config"
}

For backend projects, use appropriate structure for the language/framework.

Requirements:
- Use modern ${projectType} patterns from 2025
- Follow current best practices and security standards
- Create production-ready, scalable code
- Include proper error handling and logging
- Implement responsive design (for UI projects)
- Add comprehensive documentation
- Follow the style requirements exactly
- Use patterns from the real-time knowledge above

IMPORTANT: Return ONLY the JSON object. No explanations, no markdown, no code blocks.`
      } else {
        // Standard mode with document retrieval + real-time search
        const docs = await this.retrieveRelevantDocs(enhancedPrompt)
        const contextualPrompt = `${docs.map((d) => d.text).join("\n\n")}${realTimeKnowledge}\n\nUser: ${enhancedPrompt}`

        codeGenPrompt = `You are v0-1.0-md, a specialized code generation model with access to real-time knowledge from May 2025.

${contextualPrompt}

Focus on:
- Clean, readable code using modern ${projectType} patterns from 2025
- Best practices from both the provided context and current May 2025 standards
- Proper structure following latest conventions for ${projectType}
- Working functionality with modern approaches
- Security considerations from current 2025 best practices
- Performance optimizations using latest techniques
- Accessibility and inclusive design principles

Generate ONLY the code, no explanations:`
      }

      await pipelineLogger.logStage(
        request.requestId,
        "CODE_GEN_START",
        {
          prompt: enhancedPrompt,
          mode: request.mode,
          projectType,
          promptLength: codeGenPrompt.length,
          stylePreferences: request.stylePreferences,
          hasRealTimeKnowledge: realTimeKnowledge.length > 0,
        },
        null,
        0,
      )

      const result = await Promise.race([
        generateText({
          model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
          prompt: codeGenPrompt,
          system: `You are v0-1.0-md, a multi-platform code generation specialist with access to real-time knowledge from May 2025. You can generate code for any technology stack including React, Vue, Angular, Svelte, Flutter, React Native, Tauri, Electron, Python, Rust, Go, and more. Use modern patterns and current best practices. Output only clean, functional code.`,
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
          realTimeKnowledgeUsed: realTimeKnowledge.length > 0,
          projectType,
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
      const projectType = rawCode.metadata?.projectType || this.detectProjectType(rawCode.prompt)

      let reviewPrompt: string

      if (request.mode === "codegen") {
        reviewPrompt = `You are the Groq Supervisor, an expert code reviewer for ${projectType} projects. Review this code structure generated by v0-1.0-md:

ORIGINAL REQUEST: ${rawCode.prompt}
PROJECT TYPE: ${projectType}

CODE TO REVIEW:
\`\`\`
${rawCode.code}
\`\`\`

Check for:
- Valid project structure for ${projectType}
- Modern ${projectType} patterns and best practices from 2025
- Proper syntax and conventions
- Security considerations
- Performance optimizations
- Accessibility standards (for UI projects)
- Error handling and logging
- Documentation quality

Provide a structured review in this EXACT format:

QUALITY_SCORE: [1-10]
SECURITY_ISSUES: [list any security concerns, or "NONE"]
PERFORMANCE_ISSUES: [list any performance concerns, or "NONE"]
REVIEW_NOTES: [detailed feedback on the project structure and code quality]
SUGGESTED_FIXES: [specific improvements, or "NONE"]
VERDICT: [APPROVE/REJECT/NEEDS_REVISION]

Be thorough but constructive in your review.`
      } else {
        reviewPrompt = `You are the Groq Supervisor, an expert code reviewer and mentor for ${projectType}. Review this code generated by v0-1.0-md:

ORIGINAL REQUEST: ${rawCode.prompt}
PROJECT TYPE: ${projectType}

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

      await pipelineLogger.logStage(request.requestId, "REVIEW_START", { code: rawCode.code, projectType }, null, 0)

      const result = await Promise.race([
        generateText({
          model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
          prompt: reviewPrompt,
          system: `You are the Groq Supervisor - a senior code reviewer with expertise in all major programming languages and frameworks as of May 2025. Provide structured, actionable code reviews.`,
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
          projectType,
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
