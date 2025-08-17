import { simpleCounter } from "./rate-limiter"

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

export class CrawlEngine {
  private inMemoryCache = new Map<string, any>()
  private readonly CACHE_TTL = 7200000 // 2 hours in milliseconds
  private readonly MAX_CACHE_SIZE = 100 // Reduced for in-memory storage

  async crawl(url: string, options: CrawlOptions = {}): Promise<CrawlResponse> {
    const startTime = Date.now()
    const cacheKey = this.generateCacheKey(url, options)

    try {
      // Increment crawl counter
      await simpleCounter.incrementCounter(url, simpleCounter.CATEGORIES.API_CALLS)

      // Check in-memory cache first
      const cachedResult = this.getCachedResult(cacheKey)
      if (cachedResult) {
        return {
          ...cachedResult,
          crawlTime: Date.now() - startTime,
          cached: true,
        }
      }

      // Perform basic web crawl (simplified implementation)
      const crawlResult = await this.performBasicCrawl(url, options)

      // Cache the result in memory
      this.cacheResult(cacheKey, crawlResult)

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

  private async performBasicCrawl(
    url: string,
    options: CrawlOptions,
  ): Promise<Omit<CrawlResponse, "crawlTime" | "cached">> {
    try {
      console.log("Basic Crawl Request:", {
        url,
        maxDepth: options.maxDepth || 1,
        limit: options.limit || 10,
        extractDepth: options.extractDepth || "basic",
      })

      // Simple fetch-based crawl
      const response = await fetch(url, {
        method: "GET",
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BABY-Crawler/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
      }

      const html = await response.text()
      const result = this.parseHTML(url, html)

      console.log("Basic Crawl Success:", {
        url,
        contentLength: result.content.length,
        linksFound: result.links?.length || 0,
        imagesFound: result.images?.length || 0,
      })

      // Generate summary
      const summary = this.generateSummary([result])

      return {
        requestId: this.generateRequestId(),
        url,
        status: "completed",
        results: [result],
        totalPages: 1,
        summary,
      }
    } catch (error) {
      console.error("Basic crawl error:", error)
      throw error
    }
  }

  private parseHTML(url: string, html: string): CrawlResult {
    // Basic HTML parsing (simplified implementation)
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname

    // Extract basic content (remove HTML tags)
    const content = html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000) // Limit content length

    // Extract basic metadata
    const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
    const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i)

    const metadata = {
      description: descriptionMatch ? descriptionMatch[1] : undefined,
      keywords: keywordsMatch ? keywordsMatch[1].split(',').map(k => k.trim()) : undefined,
    }

    // Extract basic links
    const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi)
    const links = Array.from(linkMatches).slice(0, 20).map(match => ({
      url: this.resolveUrl(match[1], url),
      text: match[2].trim(),
      type: this.isExternalUrl(match[1], url) ? "external" : "internal" as "external" | "internal"
    }))

    // Extract basic images
    const imageMatches = html.matchAll(/<img[^>]*src=["']([^"']*)["'][^>]*(?:alt=["']([^"']*)["'])?/gi)
    const images = Array.from(imageMatches).slice(0, 10).map(match => ({
      url: this.resolveUrl(match[1], url),
      alt: match[2] || undefined
    }))

    return {
      url,
      title,
      content,
      rawContent: html.substring(0, 10000), // Limited raw content
      images,
      links,
      metadata,
      statusCode: 200,
      crawlDepth: 1,
      category: this.categorizeContent(content)
    }
  }

  private resolveUrl(href: string, baseUrl: string): string {
    try {
      return new URL(href, baseUrl).href
    } catch {
      return href
    }
  }

  private isExternalUrl(href: string, baseUrl: string): boolean {
    try {
      const linkDomain = new URL(href, baseUrl).hostname
      const baseDomain = new URL(baseUrl).hostname
      return linkDomain !== baseDomain
    } catch {
      return true
    }
  }

  private categorizeContent(content: string): string {
    const lowerContent = content.toLowerCase()
    
    if (lowerContent.includes('documentation') || lowerContent.includes('docs') || lowerContent.includes('api')) {
      return 'Documentation'
    } else if (lowerContent.includes('blog') || lowerContent.includes('article') || lowerContent.includes('news')) {
      return 'Blog'
    } else if (lowerContent.includes('product') || lowerContent.includes('service') || lowerContent.includes('pricing')) {
      return 'Product'
    } else {
      return 'General'
    }
  }

  private generateRequestId(): string {
    return `crawl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

  // Specialized crawl methods with simplified implementations
  async crawlDocumentation(url: string, options: Partial<CrawlOptions> = {}): Promise<CrawlResponse> {
    return this.crawl(url, {
      maxDepth: 2,
      maxBreadth: 50,
      limit: 100,
      extractDepth: "advanced",
      categories: ["Documentation"],
      instructions: "Extract comprehensive documentation content including code examples and guides",
      ...options,
    })
  }

  async crawlBlog(url: string, options: Partial<CrawlOptions> = {}): Promise<CrawlResponse> {
    return this.crawl(url, {
      maxDepth: 1,
      maxBreadth: 25,
      limit: 50,
      extractDepth: "basic",
      categories: ["Blog", "News"],
      instructions: "Extract blog posts and articles with publication information",
      ...options,
    })
  }

  async crawlAPI(url: string, options: Partial<CrawlOptions> = {}): Promise<CrawlResponse> {
    return this.crawl(url, {
      maxDepth: 1,
      maxBreadth: 20,
      limit: 30,
      extractDepth: "advanced",
      categories: ["API", "Documentation"],
      instructions: "Extract API documentation including endpoints and examples",
      ...options,
    })
  }

  private generateCacheKey(url: string, options: CrawlOptions): string {
    const optionsHash = Buffer.from(JSON.stringify(options)).toString("base64")
    return `crawl:${Buffer.from(url).toString("base64")}:${optionsHash}`
  }

  private getCachedResult(cacheKey: string): Omit<CrawlResponse, "crawlTime" | "cached"> | null {
    try {
      const cached = this.inMemoryCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data
      } else if (cached) {
        this.inMemoryCache.delete(cacheKey)
      }
      return null
    } catch (error) {
      console.warn("Crawl cache retrieval failed:", error)
      return null
    }
  }

  private cacheResult(cacheKey: string, result: Omit<CrawlResponse, "crawlTime" | "cached">): void {
    try {
      // Clean cache if it's getting too large
      if (this.inMemoryCache.size >= this.MAX_CACHE_SIZE) {
        const oldestKey = this.inMemoryCache.keys().next().value
        this.inMemoryCache.delete(oldestKey)
      }

      this.inMemoryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })
    } catch (error) {
      console.warn("Crawl cache storage failed:", error)
    }
  }

  async clearCache(pattern?: string): Promise<number> {
    try {
      let clearedCount = 0
      if (pattern) {
        for (const [key] of this.inMemoryCache) {
          if (key.includes(pattern)) {
            this.inMemoryCache.delete(key)
            clearedCount++
          }
        }
      } else {
        clearedCount = this.inMemoryCache.size
        this.inMemoryCache.clear()
      }
      return clearedCount
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
      const totalCachedCrawls = this.inMemoryCache.size
      let totalSize = 0

      for (const [, cachedItem] of this.inMemoryCache) {
        totalSize += JSON.stringify(cachedItem.data).length
      }

      const avgCrawlSize = totalCachedCrawls > 0 ? Math.round(totalSize / totalCachedCrawls) : 0

      return {
        totalCachedCrawls,
        avgCrawlSize,
        popularDomains: [] // Simplified - no domain tracking for now
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
        message: "Basic crawl functionality working",
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
        message: `Crawl functionality test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        details: { error: error instanceof Error ? error.stack : error },
      }
    }
  }
}

export const crawlEngine = new CrawlEngine()
