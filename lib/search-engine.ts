import { Redis } from "@upstash/redis"

// Initialize Redis client
const redis =
  process.env.USE_LOCAL_REDIS === "true"
    ? new Redis({ url: process.env.LOCAL_REDIS_URL || "redis://localhost:6379" })
    : new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })

export interface SearchResult {
  title: string
  url: string
  content: string
  score: number
  publishedDate?: string
  rawContent?: string
}

export interface SearchResponse {
  query: string
  results: SearchResult[]
  answer?: string
  images?: Array<{
    url: string
    description: string
  }>
  followUpQuestions?: string[]
  searchTime: number
  cached: boolean
}

export interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
  published_date?: string
  raw_content?: string
}

export interface TavilyResponse {
  answer?: string
  query: string
  response_time: number
  images?: Array<{
    url: string
    description: string
  }>
  results: TavilySearchResult[]
  follow_up_questions?: string[]
}

export class SearchEngine {
  private readonly TAVILY_API_URL = "https://api.tavily.com/search"
  private readonly CACHE_TTL = 3600 // 1 hour in seconds
  private readonly MAX_RESULTS = 10

  async search(
    query: string,
    options: {
      includeAnswer?: boolean
      includeImages?: boolean
      includeRawContent?: boolean
      maxResults?: number
      searchDepth?: "basic" | "advanced"
      includeDomains?: string[]
      excludeDomains?: string[]
      topic?: "general" | "news"
      days?: number
    } = {},
  ): Promise<SearchResponse> {
    const startTime = Date.now()

    // Optimize query for Tavily API (max 400 chars)
    const optimizedQuery = this.optimizeQueryForTavily(query)

    // Generate cache key with optimized query
    const cacheKey = this.generateCacheKey(optimizedQuery, options)

    try {
      // Check cache first
      const cachedResult = await this.getCachedResult(cacheKey)
      if (cachedResult) {
        return {
          ...cachedResult,
          searchTime: Date.now() - startTime,
          cached: true,
        }
      }

      // Perform Tavily search
      const searchResult = await this.performTavilySearch(optimizedQuery, options)

      // Cache the result
      await this.cacheResult(cacheKey, searchResult)

      return {
        ...searchResult,
        searchTime: Date.now() - startTime,
        cached: false,
      }
    } catch (error) {
      console.error("Search failed:", error)
      throw new Error(`Search failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Optimize query specifically for Tavily API best practices
  private optimizeQueryForTavily(query: string): string {
    if (query.length <= 400) {
      return query
    }

    console.log(`Query too long (${query.length} chars), optimizing for Tavily...`)

    // Strategy 1: Extract key technical terms and concepts
    const techTerms =
      query.match(
        /\b(react|vue|angular|next\.?js|typescript|javascript|css|html|api|database|auth|performance|security|ui|ux|responsive|mobile|desktop)\b/gi,
      ) || []
    const actionWords = query.match(/\b(create|build|develop|implement|design|optimize|secure)\b/gi) || []

    // Strategy 2: Identify the main request
    let coreRequest = ""
    if (query.includes("landing page") || query.includes("homepage")) {
      coreRequest = "landing page"
    } else if (query.includes("website")) {
      coreRequest = "website"
    } else if (query.includes("component")) {
      coreRequest = "component"
    } else if (query.includes("app")) {
      coreRequest = "app"
    }

    // Strategy 3: Build optimized query
    const optimizedParts = []

    if (actionWords.length > 0) {
      optimizedParts.push(actionWords[0])
    }

    if (coreRequest) {
      optimizedParts.push(coreRequest)
    }

    if (techTerms.length > 0) {
      optimizedParts.push(...techTerms.slice(0, 2)) // Max 2 tech terms
    }

    optimizedParts.push("best practices 2025")

    const optimized = optimizedParts.join(" ")

    // Final length check
    if (optimized.length <= 400) {
      return optimized
    }

    // Fallback: Simple truncation with smart breaking
    const words = query.split(/\s+/)
    let truncated = ""

    for (const word of words) {
      const potential = truncated + (truncated ? " " : "") + word
      if (potential.length <= 397) {
        // Leave room for "..."
        truncated = potential
      } else {
        break
      }
    }

    return truncated + (truncated.length < query.length ? "..." : "")
  }

  private async performTavilySearch(
    optimizedQuery: string,
    options: {
      includeAnswer?: boolean
      includeImages?: boolean
      includeRawContent?: boolean
      maxResults?: number
      searchDepth?: "basic" | "advanced"
      includeDomains?: string[]
      excludeDomains?: string[]
      topic?: "general" | "news"
      days?: number
    },
  ): Promise<Omit<SearchResponse, "searchTime" | "cached">> {
    // Validate API key format
    if (!process.env.TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY environment variable is not set")
    }

    // Ensure API key has the correct format
    const apiKey = process.env.TAVILY_API_KEY.startsWith("tvly-")
      ? process.env.TAVILY_API_KEY
      : `tvly-${process.env.TAVILY_API_KEY}`

    // Validate and optimize parameters based on Tavily best practices
    const maxResults = Math.min(
      options.maxResults || 8, // Increased default for better knowledge
      options.searchDepth === "advanced" ? 15 : 20, // Optimized limits
    )

    // Use time_range for recent information when relevant
    const requestBody = {
      query: optimizedQuery, // Use the optimized query
      topic: options.topic || "general",
      search_depth: options.searchDepth || "advanced", // Default to advanced for better relevance
      include_answer: options.includeAnswer ?? true,
      include_images: options.includeImages ?? false,
      include_raw_content: options.includeRawContent ?? false,
      max_results: maxResults,
      ...(options.includeDomains && { include_domains: options.includeDomains }),
      ...(options.excludeDomains && { exclude_domains: options.excludeDomains }),
      ...(options.topic === "news" && options.days && { days: options.days }),
      // Add time_range for development-related queries to get recent info
      ...(optimizedQuery.toLowerCase().includes("2025") ||
      optimizedQuery.toLowerCase().includes("latest") ||
      optimizedQuery.toLowerCase().includes("modern")
        ? { time_range: "month" }
        : {}),
    }

    // Remove undefined values
    Object.keys(requestBody).forEach((key) => {
      if (requestBody[key as keyof typeof requestBody] === undefined) {
        delete requestBody[key as keyof typeof requestBody]
      }
    })

    console.log("Tavily API Request:", {
      url: this.TAVILY_API_URL,
      body: requestBody,
      apiKeyFormat: apiKey.substring(0, 10) + "...",
    })

    const response = await fetch(this.TAVILY_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Tavily API Error Response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
      throw new Error(`Tavily API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data: TavilyResponse = await response.json()

    console.log("Tavily API Success:", {
      query: data.query,
      resultCount: data.results?.length || 0,
      hasAnswer: !!data.answer,
      responseTime: data.response_time,
    })

    return {
      query: data.query,
      results: (data.results || []).map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content,
        score: result.score,
        publishedDate: result.published_date,
        rawContent: result.raw_content,
      })),
      answer: data.answer,
      images: data.images,
      followUpQuestions: data.follow_up_questions,
    }
  }

  private generateCacheKey(query: string, options: any): string {
    const optionsHash = Buffer.from(JSON.stringify(options)).toString("base64")
    return `search:${Buffer.from(query).toString("base64")}:${optionsHash}`
  }

  private async getCachedResult(cacheKey: string): Promise<Omit<SearchResponse, "searchTime" | "cached"> | null> {
    try {
      const cached = await redis.get(cacheKey)
      return cached ? JSON.parse(cached as string) : null
    } catch (error) {
      console.warn("Cache retrieval failed:", error)
      return null
    }
  }

  private async cacheResult(cacheKey: string, result: Omit<SearchResponse, "searchTime" | "cached">): Promise<void> {
    try {
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result))
    } catch (error) {
      console.warn("Cache storage failed:", error)
    }
  }

  async getRelatedQueries(query: string): Promise<string[]> {
    const cacheKey = `related:${Buffer.from(query).toString("base64")}`

    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached as string)
      }

      // Generate related queries using search results
      const searchResult = await this.search(query, {
        maxResults: 5,
        includeAnswer: false,
      })

      const relatedQueries = this.extractRelatedQueries(searchResult.results)

      // Cache for 24 hours
      await redis.setex(cacheKey, 86400, JSON.stringify(relatedQueries))

      return relatedQueries
    } catch (error) {
      console.error("Failed to get related queries:", error)
      return []
    }
  }

  private extractRelatedQueries(results: SearchResult[]): string[] {
    // Simple extraction of potential related queries from titles and content
    const queries = new Set<string>()

    results.forEach((result) => {
      // Extract potential queries from titles
      const titleWords = result.title.toLowerCase().split(/\s+/)
      if (titleWords.length >= 2 && titleWords.length <= 5) {
        queries.add(result.title)
      }

      // Extract key phrases from content
      const sentences = result.content.split(/[.!?]+/)
      sentences.forEach((sentence) => {
        const words = sentence.trim().split(/\s+/)
        if (words.length >= 3 && words.length <= 6) {
          const phrase = words.join(" ").trim()
          if (phrase.length > 10 && phrase.length < 100) {
            queries.add(phrase)
          }
        }
      })
    })

    return Array.from(queries).slice(0, 10)
  }

  async clearCache(pattern?: string): Promise<number> {
    try {
      const keys = pattern ? await redis.keys(`search:*${pattern}*`) : await redis.keys("search:*")

      if (keys.length === 0) return 0

      await redis.del(...keys)
      return keys.length
    } catch (error) {
      console.error("Cache clearing failed:", error)
      return 0
    }
  }

  async getSearchStats(): Promise<{
    totalCachedQueries: number
    cacheHitRate: number
    popularQueries: Array<{ query: string; count: number }>
  }> {
    try {
      const keys = await redis.keys("search:*")
      const statsKey = "search:stats"
      const stats = await redis.get(statsKey)

      return {
        totalCachedQueries: keys.length,
        cacheHitRate: stats ? JSON.parse(stats as string).hitRate || 0 : 0,
        popularQueries: stats ? JSON.parse(stats as string).popular || [] : [],
      }
    } catch (error) {
      console.error("Failed to get search stats:", error)
      return {
        totalCachedQueries: 0,
        cacheHitRate: 0,
        popularQueries: [],
      }
    }
  }

  // Test method to validate API connection
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const testResult = await this.search("test query", {
        maxResults: 1,
        searchDepth: "basic",
        includeAnswer: false,
      })

      return {
        success: true,
        message: "Tavily API connection successful",
        details: {
          resultCount: testResult.results.length,
          searchTime: testResult.searchTime,
          cached: testResult.cached,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: `Tavily API connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        details: { error: error instanceof Error ? error.stack : error },
      }
    }
  }
}

export const searchEngine = new SearchEngine()
