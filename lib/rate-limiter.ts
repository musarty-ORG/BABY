/**
 * Rate Limiter - Stub Implementation
 * 
 * TODO: Remove - Neon Auth handles rate limiting
 * Neon Auth provides built-in rate limiting for:
 * - Authentication attempts
 * - API requests
 * - Email sending
 */

export class RateLimiter {
  constructor(options: any) {
    console.warn("RateLimiter: Neon Auth handles rate limiting")
  }
  
  async check(key: string): Promise<boolean> {
    console.warn("RateLimiter.check: Neon Auth handles rate limiting")
    return true
  }
  
  async increment(key: string): Promise<void> {
    console.warn("RateLimiter.increment: Neon Auth handles rate limiting")
  }
}

export const rateLimiter = new RateLimiter({})
