import type { NextRequest } from "next/server"
import { RateLimitError } from "./error-handler"
import { pipelineLogger } from "./pipeline-logger"

interface RateLimitRule {
  key: string
  limit: number
  window: number // in seconds
  errorMessage?: string
}

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number // timestamp when the limit resets
  limit: number
}

class RateLimiter {
  private cache = new Map<string, { count: number; expires: number }>()

  constructor() {
    // Clean up expired entries every minute
    setInterval(() => this.cleanupExpiredEntries(), 60 * 1000)
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (value.expires < now) {
        this.cache.delete(key)
      }
    }
  }

  async checkLimit(rule: RateLimitRule): Promise<RateLimitResult> {
    const now = Date.now()
    const windowMs = rule.window * 1000
    const key = rule.key
    const expires = now + windowMs

    let entry = this.cache.get(key)

    if (!entry || entry.expires < now) {
      // Create new entry if none exists or if expired
      entry = { count: 1, expires }
      this.cache.set(key, entry)

      return {
        success: true,
        remaining: rule.limit - 1,
        reset: expires,
        limit: rule.limit,
      }
    }

    // Increment existing entry
    entry.count++

    // Check if over limit
    if (entry.count > rule.limit) {
      return {
        success: false,
        remaining: 0,
        reset: entry.expires,
        limit: rule.limit,
      }
    }

    return {
      success: true,
      remaining: rule.limit - entry.count,
      reset: entry.expires,
      limit: rule.limit,
    }
  }

  async checkMultipleRules(rules: RateLimitRule[]): Promise<RateLimitResult> {
    for (const rule of rules) {
      const result = await this.checkLimit(rule)
      if (!result.success) {
        return result
      }
    }

    // All rules passed
    return {
      success: true,
      remaining: Math.min(...rules.map((r) => r.limit)) - 1, // Conservative estimate
      reset: Math.min(...rules.map((r) => Date.now() + r.window * 1000)),
      limit: Math.min(...rules.map((r) => r.limit)),
    }
  }
}

export const rateLimiter = new RateLimiter()

export async function applyRateLimit(
  req: NextRequest,
  rules: RateLimitRule[],
  requestId: string,
): Promise<RateLimitResult> {
  try {
    const result = await rateLimiter.checkMultipleRules(rules)

    if (!result.success) {
      const errorMessage = rules.find((r) => !r.errorMessage)?.errorMessage || "Rate limit exceeded"
      await pipelineLogger.logWarning(requestId, "RATE_LIMITER", `Rate limit exceeded: ${rules[0].key}`)
      throw new RateLimitError(errorMessage)
    }

    return result
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error
    }

    // Log unexpected errors but don't block the request
    await pipelineLogger.logError(
      requestId,
      "RATE_LIMITER",
      `Unexpected error in rate limiter: ${error.message}`,
      false,
      { stack: error.stack },
    )

    // Allow the request to proceed if rate limiting fails
    return {
      success: true,
      remaining: 100,
      reset: Date.now() + 60 * 1000,
      limit: 100,
    }
  }
}

export { RateLimiter }
