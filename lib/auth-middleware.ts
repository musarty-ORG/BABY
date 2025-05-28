import type { NextRequest } from "next/server"
import { authSystem } from "./auth-system"
import { AuthenticationError, AuthorizationError } from "./error-handler"
import { analyticsEngine } from "./analytics-engine"

export async function requireAuth(req: NextRequest) {
  const sessionId = req.headers.get("authorization")?.replace("Bearer ", "")
  const apiKey = req.headers.get("x-api-key")

  // Check for API key first (for programmatic access)
  if (apiKey) {
    if (apiKey !== process.env.API_SECRET_KEY) {
      throw new AuthenticationError("Invalid API key")
    }

    // Track API key usage
    await analyticsEngine.trackEvent({
      type: "api_call",
      endpoint: req.url,
      method: req.method,
      status_code: 200,
      metadata: { authType: "api_key" },
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

  // Track session usage
  await analyticsEngine.trackEvent({
    type: "api_call",
    endpoint: req.url,
    method: req.method,
    status_code: 200,
    user_id: session.id,
    metadata: { authType: "session" },
  })

  return session
}

export async function requireAdmin(req: NextRequest) {
  const session = await requireAuth(req)

  if (session.role !== "admin" && session.authType !== "api_key") {
    throw new AuthorizationError("Admin access required")
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

// Rate limiting middleware
export async function checkRateLimit(req: NextRequest, identifier: string, limit = 100, window = 3600) {
  // TODO: Implement proper rate limiting with Upstash Redis
  // For now, we'll use a simple in-memory counter
  const key = `rate_limit:${identifier}:${Math.floor(Date.now() / (window * 1000))}`

  // This is a placeholder - in production, use Redis for distributed rate limiting
  // const count = await redis.incr(key)
  // if (count === 1) await redis.expire(key, window)
  // if (count > limit) throw new ValidationError("Rate limit exceeded")

  return true
}
