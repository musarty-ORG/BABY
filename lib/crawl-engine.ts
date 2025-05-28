import { Redis } from "@upstash/redis"
import { searchEngine } from "./search-engine"

// Initialize Redis for crawl caching
const redis =
  process.env.USE_LOCAL_REDIS === "true"
    ? new Redis({ url: process.env.LOCAL_REDIS_URL || "redis://localhost:6379" })
    : new Redis({
        url: process.env.KV_REST_API_URL!,
        token: process.env.KV_REST_API_TOKEN!,
      })

export interface CrawlOptions {
  maxDepth?: number
  maxBreadth?: number
  limit?: number
  extractDepth?: "basic" | "advanced"
  selectPaths?: string[]
  excludePaths?: string[]
  selectDomains?: string[]
  excludeDomains?: string[]
  categories?: string[]
  instructions?: string
  includeImages?: boolean
  includePdfs?: boolean
  includeRawHtml?: boolean
}

export interface CrawlResult {
  url: string
  title: string
  content: string
  rawContent?: string
  images?: Array<{
    url: string
    alt?: string
    description?: string
  }>
  links?: Array<{
    url: string
    text: string
    type: "internal" | "external"
  }>
  metadata?: {
    description?: string
    keywords?: string[]
    author?: string
    publishedDate?: string
    lastModified?: string
  }
  statusCode: number
  crawlDepth: number
  category?: string
}

export interface CrawlResponse {
  requestId: string
  url: string
  status: "completed" | "partial" | "failed"
  results: CrawlResult[]
  totalPages: number
  crawlTime: number
  cached: boolean
  summary?: {
    categories: Record<string, number>
    avgContentLength: number
    totalImages: number
    totalLinks: number
    errorPages: number
  }
}

export interface TavilyCrawlRequest {
  url: string
  max_depth?: number
  max_breadth?: number
  limit?: number
  extract_depth?: "basic" | "advanced"
  select_paths?: string[]
  exclude_paths?: string[]
  select_domains?: string[]
  exclude_domains?: string[]
  categories?: string[]
  instructions?: string
  include_images?: boolean
  include_pdfs?: boolean
  include_raw_html?: boolean
}

export interface TavilyCrawlResponse {
  request_id: string
  url: string
  status: string
  results: Array<{
    url: string
    title: string
    content: string
    raw_content?: string
    images?: Array<{
      url: string
      alt?: string
      description?: string
    }>
    links?: Array<{
      url: string
      text: string
      type: string
    }>
    metadata?: {
      description?: string
      keywords?: string[]
      author?: string
      published_date?: string
      last_modified?: string
    }
    status_code: number
    crawl_depth: number
    category?: string
  }>
  total_pages: number
  crawl_time: number
}

export class CrawlEngine {
  private readonly TAVILY_CRAWL_URL = "https://api.tavily.com/crawl"
  private readonly CACHE_TTL = 7200 // 2 hours for crawl results
  private readonly MAX_CACHE_SIZE = 1000 // Maximum cached crawl results

  async crawl(url: string, options: CrawlOptions = {}): Promise<CrawlResponse> {
    const startTime = Date.now()
    const cacheKey = this.generateCacheKey(url, options)

    try {
      // Check cache first
      const cachedResult = await this.getCachedResult(cacheKey)
      if (cachedResult) {
        return {
          ...cachedResult,
          crawlTime: Date.now() - startTime,
          cached: true,
        }
      }

      // Perform Tavily crawl
      const crawlResult = await this.performTavilyCrawl(url, options)

      // Cache the result
      await this.cacheResult(cacheKey, crawlResult)

      return {
        ...crawlResult,
        crawlTime: Date.now() - startTime,
        cached: false,
      }
    } catch (error) {
      console.error("Crawl failed:", error)
      throw new Error(`Crawl failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private async performTavilyCrawl(
    url: string,
    options: CrawlOptions,
  ): Promise<Omit<CrawlResponse, "crawlTime" | "cached">> {
    if (!process.env.TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY environment variable is not set")
    }

    const apiKey = process.env.TAVILY_API_KEY.startsWith("tvly-")
      ? process.env.TAVILY_API_KEY
      : `tvly-${process.env.TAVILY_API_KEY}`

    const requestBody: TavilyCrawlRequest = {
      url,
      max_depth: options.maxDepth || 2,
      max_breadth: options.maxBreadth || 50,
      limit: options.limit || 100,
      extract_depth: options.extractDepth || "basic",
      select_paths: options.selectPaths,
      exclude_paths: options.excludePaths,
      select_domains: options.selectDomains,
      exclude_domains: options.excludeDomains,
      categories: options.categories,
      instructions: options.instructions,
      include_images: options.includeImages || false,
      include_pdfs: options.includePdfs || false,
      include_raw_html: options.includeRawHtml || false,
    }

    // Remove undefined values
    Object.keys(requestBody).forEach((key) => {
      if (requestBody[key as keyof TavilyCrawlRequest] === undefined) {
        delete requestBody[key as keyof TavilyCrawlRequest]
      }
    })

    console.log("Tavily Crawl Request:", {
      url: requestBody.url,
      maxDepth: requestBody.max_depth,
      limit: requestBody.limit,
      extractDepth: requestBody.extract_depth,
    })

    const response = await fetch(this.TAVILY_CRAWL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Tavily Crawl API Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
      throw new Error(`Tavily Crawl API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data: TavilyCrawlResponse = await response.json()

    console.log("Tavily Crawl Success:", {
      requestId: data.request_id,
      totalPages: data.total_pages,
      crawlTime: data.crawl_time,
      status: data.status,
    })

    // Transform response to our format
    const results: CrawlResult[] = data.results.map((result) => ({
      url: result.url,
      title: result.title,
      content: result.content,
      rawContent: result.raw_content,
      images: result.images,
      links: result.links?.map((link) => ({
        url: link.url,
        text: link.text,
        type: link.type as "internal" | "external",
      })),
      metadata: result.metadata
        ? {
            description: result.metadata.description,
            keywords: result.metadata.keywords,
            author: result.metadata.author,
            publishedDate: result.metadata.published_date,
            lastModified: result.metadata.last_modified,
          }
        : undefined,
      statusCode: result.status_code,
      crawlDepth: result.crawl_depth,
      category: result.category,
    }))

    // Generate summary
    const summary = this.generateSummary(results)

    return {
      requestId: data.request_id,
      url: data.url,
      status: data.status as "completed" | "partial" | "failed",
      results,
      totalPages: data.total_pages,
      summary,
    }
  }

  private generateSummary(results: CrawlResult[]) {
    const categories: Record<string, number> = {}
    let totalContentLength = 0
    let totalImages = 0
    let totalLinks = 0
    let errorPages = 0

    results.forEach((result) => {
      // Count categories
      if (result.category) {
        categories[result.category] = (categories[result.category] || 0) + 1
      }

      // Calculate metrics
      totalContentLength += result.content.length
      totalImages += result.images?.length || 0
      totalLinks += result.links?.length || 0

      if (result.statusCode >= 400) {
        errorPages++
      }
    })

    return {
      categories,
      avgContentLength: results.length > 0 ? Math.round(totalContentLength / results.length) : 0,
      totalImages,
      totalLinks,
      errorPages,
    }
  }

  // Specialized crawl methods for different use cases

  async crawlDocumentation(url: string, options: Partial<CrawlOptions> = {}): Promise<CrawlResponse> {
    return this.crawl(url, {
      maxDepth: 3,
      maxBreadth: 100,
      limit: 200,
      extractDepth: "advanced",
      categories: ["Documentation"],
      selectPaths: ["/docs/.*", "/documentation/.*", "/guide/.*", "/api/.*"],
      excludePaths: ["/admin/.*", "/private/.*", "/login/.*"],
      instructions: "Extract comprehensive documentation content including code examples, API references, and guides",
      ...options,
    })
  }

  async crawlBlog(url: string, options: Partial<CrawlOptions> = {}): Promise<CrawlResponse> {
    return this.crawl(url, {
      maxDepth: 2,
      maxBreadth: 50,
      limit: 100,
      extractDepth: "basic",
      categories: ["Blog", "News"],
      selectPaths: ["/blog/.*", "/news/.*", "/articles/.*", "/posts/.*"],
      excludePaths: ["/admin/.*", "/private/.*"],
      instructions: "Extract blog posts and articles with publication dates and author information",
      ...options,
    })
  }

  async crawlAPI(url: string, options: Partial<CrawlOptions> = {}): Promise<CrawlResponse> {
    return this.crawl(url, {
      maxDepth: 2,
      maxBreadth: 30,
      limit: 50,
      extractDepth: "advanced",
      categories: ["API", "Documentation"],
      selectPaths: ["/api/.*", "/reference/.*", "/endpoints/.*"],
      instructions: "Extract API documentation including endpoints, parameters, examples, and response formats",
      ...options,
    })
  }

  async crawlChangelog(url: string, options: Partial<CrawlOptions> = {}): Promise<CrawlResponse> {
    return this.crawl(url, {
      maxDepth: 2,
      maxBreadth: 20,
      limit: 50,
      extractDepth: "basic",
      categories: ["Changelog", "Updates"],
      selectPaths: ["/changelog/.*", "/releases/.*", "/updates/.*", "/history/.*"],
      instructions: "Extract version history, release notes, and change information with dates",
      ...options,
    })
  }

  async crawlGitHubRepo(repoUrl: string, options: Partial<CrawlOptions> = {}): Promise<CrawlResponse> {
    return this.crawl(repoUrl, {
      maxDepth: 2,
      maxBreadth: 100,
      limit: 200,
      extractDepth: "advanced",
      categories: ["Code", "Documentation"],
      selectPaths: ["/blob/.*", "/tree/.*", "/wiki/.*"],
      excludePaths: ["/issues/.*", "/pull/.*", "/actions/.*"],
      instructions: "Extract README files, documentation, code examples, and project structure",
      includeRawHtml: true,
      ...options,
    })
  }

  // Enhanced search with crawl integration
  async searchAndCrawl(
    query: string,
    targetUrls: string[],
    options: CrawlOptions = {},
  ): Promise<{
    searchResults: any
    crawlResults: CrawlResponse[]
    combinedInsights: string[]
  }> {
    try {
      // First, perform regular search
      const searchResults = await searchEngine.search(query, {
        maxResults: 5,
        searchDepth: "advanced",
      })

      // Then crawl specific URLs for deeper content
      const crawlPromises = targetUrls.map((url) =>
        this.crawl(url, {
          maxDepth: 2,
          limit: 50,
          extractDepth: "advanced",
          instructions: `Find information related to: ${query}`,
          ...options,
        }),
      )

      const crawlResults = await Promise.all(crawlPromises)

      // Generate combined insights
      const combinedInsights = this.generateCombinedInsights(searchResults, crawlResults, query)

      return {
        searchResults,
        crawlResults,
        combinedInsights,
      }
    } catch (error) {
      console.error("Search and crawl failed:", error)
      throw error
    }
  }

  private generateCombinedInsights(searchResults: any, crawlResults: CrawlResponse[], query: string): string[] {
    const insights: string[] = []

    // Analyze search vs crawl coverage
    const searchUrls = new Set(searchResults.results.map((r: any) => r.url))
    const crawlUrls = new Set(crawlResults.flatMap((cr) => cr.results.map((r) => r.url)))

    const uniqueToCrawl = Array.from(crawlUrls).filter((url) => !searchUrls.has(url))
    if (uniqueToCrawl.length > 0) {
      insights.push(`Crawling discovered ${uniqueToCrawl.length} additional relevant pages not found in search`)
    }

    // Analyze content depth
    const avgCrawlContentLength =
      crawlResults.reduce((sum, cr) => sum + (cr.summary?.avgContentLength || 0), 0) / crawlResults.length

    if (avgCrawlContentLength > 1000) {
      insights.push(
        `Crawled content provides detailed information (avg ${Math.round(avgCrawlContentLength)} chars per page)`,
      )
    }

    // Analyze categories
    const categories = new Set(crawlResults.flatMap((cr) => Object.keys(cr.summary?.categories || {})))

    if (categories.size > 1) {
      insights.push(
        `Found information across ${categories.size} content categories: ${Array.from(categories).join(", ")}`,
      )
    }

    return insights
  }

  private generateCacheKey(url: string, options: CrawlOptions): string {
    const optionsHash = Buffer.from(JSON.stringify(options)).toString("base64")
    return `crawl:${Buffer.from(url).toString("base64")}:${optionsHash}`
  }

  private async getCachedResult(cacheKey: string): Promise<Omit<CrawlResponse, "crawlTime" | "cached"> | null> {
    try {
      const cached = await redis.get(cacheKey)
      return cached ? JSON.parse(cached as string) : null
    } catch (error) {
      console.warn("Crawl cache retrieval failed:", error)
      return null
    }
  }

  private async cacheResult(cacheKey: string, result: Omit<CrawlResponse, "crawlTime" | "cached">): Promise<void> {
    try {
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result))
    } catch (error) {
      console.warn("Crawl cache storage failed:", error)
    }
  }

  async clearCache(pattern?: string): Promise<number> {
    try {
      const keys = pattern ? await redis.keys(`crawl:*${pattern}*`) : await redis.keys("crawl:*")
      if (keys.length === 0) return 0
      await redis.del(...keys)
      return keys.length
    } catch (error) {
      console.error("Crawl cache clearing failed:", error)
      return 0
    }
  }

  async getCrawlStats(): Promise<{
    totalCachedCrawls: number
    avgCrawlSize: number
    popularDomains: Array<{ domain: string; count: number }>
  }> {
    try {
      const keys = await redis.keys("crawl:*")
      const statsKey = "crawl:stats"
      const stats = await redis.get(statsKey)

      return {
        totalCachedCrawls: keys.length,
        avgCrawlSize: stats ? JSON.parse(stats as string).avgSize || 0 : 0,
        popularDomains: stats ? JSON.parse(stats as string).domains || [] : [],
      }
    } catch (error) {
      console.error("Failed to get crawl stats:", error)
      return {
        totalCachedCrawls: 0,
        avgCrawlSize: 0,
        popularDomains: [],
      }
    }
  }

  // Test crawl connection
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const testResult = await this.crawl("https://example.com", {
        maxDepth: 1,
        limit: 1,
        extractDepth: "basic",
      })

      return {
        success: true,
        message: "Tavily Crawl API connection successful",
        details: {
          requestId: testResult.requestId,
          totalPages: testResult.totalPages,
          crawlTime: testResult.crawlTime,
          cached: testResult.cached,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: `Tavily Crawl API connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        details: { error: error instanceof Error ? error.stack : error },
      }
    }
  }
}

export const crawlEngine = new CrawlEngine()
