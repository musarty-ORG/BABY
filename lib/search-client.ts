export interface SearchOptions {
  includeAnswer?: boolean
  includeImages?: boolean
  includeRawContent?: boolean
  maxResults?: number
  searchDepth?: "basic" | "advanced"
  includeDomains?: string[]
  excludeDomains?: string[]
}

export interface StreamSearchEvent {
  type: "status" | "answer" | "result" | "images" | "followup" | "complete" | "error"
  data?: any
  message?: string
  error?: string
  index?: number
  total?: number
  timestamp: string
}

export class SearchClient {
  private baseUrl: string

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl
  }

  async search(query: string, options: SearchOptions = {}) {
    const response = await fetch(`${this.baseUrl}/api/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        ...options,
      }),
    })

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`)
    }

    return response.json()
  }

  async getRelatedQueries(query: string) {
    const response = await fetch(`${this.baseUrl}/api/search/related?q=${encodeURIComponent(query)}`)

    if (!response.ok) {
      throw new Error(`Failed to get related queries: ${response.statusText}`)
    }

    return response.json()
  }

  async streamSearch(query: string, options: SearchOptions = {}, onEvent: (event: StreamSearchEvent) => void) {
    const response = await fetch(`${this.baseUrl}/api/search/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        options,
      }),
    })

    if (!response.ok) {
      throw new Error(`Stream search failed: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("No response body")
    }

    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6))
              onEvent(event)
            } catch (error) {
              console.warn("Failed to parse SSE event:", error)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async getStats() {
    const response = await fetch(`${this.baseUrl}/api/search/stats`)

    if (!response.ok) {
      throw new Error(`Failed to get search stats: ${response.statusText}`)
    }

    return response.json()
  }

  async clearCache(pattern?: string) {
    const url = pattern
      ? `${this.baseUrl}/api/search/stats?pattern=${encodeURIComponent(pattern)}`
      : `${this.baseUrl}/api/search/stats`

    const response = await fetch(url, { method: "DELETE" })

    if (!response.ok) {
      throw new Error(`Failed to clear cache: ${response.statusText}`)
    }

    return response.json()
  }
}

export const searchClient = new SearchClient()
