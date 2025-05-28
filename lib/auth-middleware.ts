import type { NextRequest } from "next/server"
import { authSystem } from "./auth-system"
import { AuthenticationError, AuthorizationError, RateLimitError } from "./error-handler"
import { analyticsEngine } from "./analytics-engine"
import { rateLimiter, RateLimiter } from "./rate-limiter"

export async function requireAuth(req: NextRequest) {
  const sessionId = req.headers.get("authorization")?.replace("Bearer ", "")
  const apiKey = req.headers.get("x-api-key")
  const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"

  // Check for API key first (for programmatic access)
  if (apiKey) {
    if (apiKey !== process.env.API_SECRET_KEY) {
      throw new AuthenticationError("Invalid API key")
    }

    // Rate limit API key usage
    const rateLimitResult = await rateLimiter.checkLimit({
      identifier: `api_key:${apiKey.slice(-8)}`,
      ...RateLimiter.RULES.API_GENERAL,
    })

    if (!rateLimitResult.success) {
      throw new RateLimitError(`API rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds`)
    }

    // Track API key usage
    await analyticsEngine.trackEvent({
      type: "api_call",
      endpoint: req.url,
      method: req.method,
      status_code: 200,
      metadata: {
        authType: "api_key",
        rateLimitRemaining: rateLimitResult.remaining,
        clientIP,
      },
    })

    return { id: "api_user", email: "api@system", role: "user", authType: "api_key" }
  }

  // Check for session token
  if (!sessionId) {
    throw new AuthenticationError("Authentication required - provide session token or API key")
  }

  const session = await authSystem.validateSession(sessionId)

  if (!session) {
    throw new AuthenticationError("Invalid or expired session")
  }

  // Rate limit session usage
  const rateLimitResult = await rateLimiter.checkLimit({
    identifier: `user:${session.userId}`,
    ...RateLimiter.RULES.API_GENERAL,
  })

  if (!rateLimitResult.success) {
    throw new RateLimitError(`Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds`)
  }

  // Track session usage
  await analyticsEngine.trackEvent({
    type: "api_call",
    endpoint: req.url,
    method: req.method,
    status_code: 200,
    user_id: session.userId,
    metadata: {
      authType: "session",
      rateLimitRemaining: rateLimitResult.remaining,
      clientIP,
    },
  })

  return session
}

export async function requireAdmin(req: NextRequest) {
  const session = await requireAuth(req)

  if (session.role !== "admin" && session.authType !== "api_key") {
    throw new AuthorizationError("Admin access required")
  }

  // Additional rate limiting for admin actions
  if (session.authType !== "api_key") {
    const rateLimitResult = await rateLimiter.checkLimit({
      identifier: `admin:${session.userId}`,
      ...RateLimiter.RULES.ADMIN_ACTION,
    })

    if (!rateLimitResult.success) {
      throw new RateLimitError(`Admin rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds`)
    }
  }

  return session
}

export async function requireModeratorOrAdmin(req: NextRequest) {
  const session = await requireAuth(req)

  if (!["admin", "moderator"].includes(session.role) && session.authType !== "api_key") {
    throw new AuthorizationError("Moderator or admin access required")
  }

  return session
}

// Enhanced rate limiting middleware with multiple rules
export async function checkRateLimit(req: NextRequest, identifier: string, rules: string[] = ["API_GENERAL"]) {
  const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"

  const rateLimitConfigs = rules.map((ruleName) => ({
    identifier: `${identifier}:${clientIP}`,
    ...(RateLimiter.RULES as any)[ruleName],
  }))

  const result = await rateLimiter.checkMultipleRules(rateLimitConfigs)

  if (!result.success) {
    throw new RateLimitError(`Rate limit exceeded. Try again in ${result.retryAfter} seconds`)
  }

  return result
}

// Specific rate limiting functions for different endpoints
export async function checkOTPRateLimit(req: NextRequest, email: string) {
  const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"

  const rules = [
    { identifier: `otp:email:${email}`, ...RateLimiter.RULES.OTP_REQUEST },
    { identifier: `otp:ip:${clientIP}`, ...RateLimiter.RULES.OTP_REQUEST },
  ]

  const result = await rateLimiter.checkMultipleRules(rules)

  if (!result.success) {
    throw new RateLimitError(`Too many OTP requests. Try again in ${result.retryAfter} seconds`)
  }

  return result
}

export async function checkLoginRateLimit(req: NextRequest, email: string) {
  const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"

  const rules = [
    { identifier: `login:email:${email}`, ...RateLimiter.RULES.LOGIN_ATTEMPT },
    { identifier: `login:ip:${clientIP}`, ...RateLimiter.RULES.LOGIN_ATTEMPT },
  ]

  const result = await rateLimiter.checkMultipleRules(rules)

  if (!result.success) {
    throw new RateLimitError(`Too many login attempts. Try again in ${result.retryAfter} seconds`)
  }

  return result
}

export async function checkChatRateLimit(req: NextRequest, userId: string) {
  const result = await rateLimiter.checkLimit({
    identifier: `chat:${userId}`,
    ...RateLimiter.RULES.CHAT_MESSAGE,
  })

  if (!result.success) {
    throw new RateLimitError(`Chat rate limit exceeded. Try again in ${result.retryAfter} seconds`)
  }

  return result
}
