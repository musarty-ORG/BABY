import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export interface RateLimitConfig {
  limit: number
  window: number // seconds
  identifier: string
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

export class RateLimiter {
  async checkLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    const { limit, window, identifier } = config
    const now = Date.now()
    const windowStart = Math.floor(now / (window * 1000))
    const key = `rate_limit:${identifier}:${windowStart}`

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = redis.pipeline()
      pipeline.incr(key)
      pipeline.expire(key, window)

      const results = await pipeline.exec()
      const count = results[0] as number

      const remaining = Math.max(0, limit - count)
      const resetTime = (windowStart + 1) * window * 1000

      if (count > limit) {
        return {
          success: false,
          limit,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil((resetTime - now) / 1000),
        }
      }

      return {
        success: true,
        limit,
        remaining,
        resetTime,
      }
    } catch (error) {
      console.error("Rate limiting error:", error)
      // Fail open - allow request if Redis is down
      return {
        success: true,
        limit,
        remaining: limit - 1,
        resetTime: now + window * 1000,
      }
    }
  }

  async checkMultipleRules(rules: RateLimitConfig[]): Promise<RateLimitResult> {
    const results = await Promise.all(rules.map((rule) => this.checkLimit(rule)))

    // Return the most restrictive result
    const failed = results.find((result) => !result.success)
    if (failed) return failed

    // Return the result with the least remaining requests
    return results.reduce((min, current) => (current.remaining < min.remaining ? current : min))
  }

  // Preset rate limiting rules
  static readonly RULES = {
    OTP_REQUEST: { limit: 5, window: 300 }, // 5 OTP requests per 5 minutes
    API_GENERAL: { limit: 100, window: 3600 }, // 100 requests per hour
    API_HEAVY: { limit: 10, window: 60 }, // 10 heavy operations per minute
    LOGIN_ATTEMPT: { limit: 10, window: 900 }, // 10 login attempts per 15 minutes
    ADMIN_ACTION: { limit: 50, window: 3600 }, // 50 admin actions per hour
    CHAT_MESSAGE: { limit: 30, window: 60 }, // 30 chat messages per minute
  }
}

export const rateLimiter = new RateLimiter()
