import type { NextRequest } from "next/server"
import { rateLimiter } from "./rate-limiter"
import { AuthenticationError, AuthorizationError } from "./error-handler"
import { authSystem } from "./auth-system"
import { pipelineLogger } from "./pipeline-logger"

// Rate limiting rules
const LOGIN_RULES = [
  {
    key: "global_login",
    limit: 1000,
    window: 60 * 60, // 1 hour
    errorMessage: "Too many login attempts globally",
  },
]

const OTP_RULES = [
  {
    key: "global_otp",
    limit: 500,
    window: 60 * 60, // 1 hour
    errorMessage: "Too many OTP requests globally",
  },
]

export async function checkLoginRateLimit(req: NextRequest, email: string): Promise<any> {
  const requestId = req.headers.get("X-Request-ID") || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const ip = req.headers.get("x-forwarded-for") || "unknown"

  try {
    // Create user-specific and IP-specific rules
    const rules = [
      ...LOGIN_RULES,
      {
        key: `login_email_${email.toLowerCase()}`,
        limit: 10,
        window: 60 * 15, // 15 minutes
        errorMessage: "Too many login attempts for this email",
      },
      {
        key: `login_ip_${ip}`,
        limit: 50,
        window: 60 * 60, // 1 hour
        errorMessage: "Too many login attempts from this IP address",
      },
    ]

    return await rateLimiter.checkMultipleRules(rules)
  } catch (error) {
    // Log the error but don't block the request if rate limiting fails
    await pipelineLogger.logError(requestId, "AUTH_MIDDLEWARE", `Login rate limit error: ${error.message}`, false, {
      email,
      ip,
    })

    // If it's a rate limit error, rethrow it
    if (error.name === "RateLimitError") {
      throw error
    }

    // Otherwise, allow the request to proceed
    return {
      success: true,
      remaining: 100,
      reset: Date.now() + 60 * 1000,
      limit: 100,
    }
  }
}

export async function checkOTPRateLimit(req: NextRequest, email: string): Promise<any> {
  const requestId = req.headers.get("X-Request-ID") || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const ip = req.headers.get("x-forwarded-for") || "unknown"

  try {
    // Create user-specific and IP-specific rules
    const rules = [
      ...OTP_RULES,
      {
        key: `otp_email_${email.toLowerCase()}`,
        limit: 5,
        window: 60 * 15, // 15 minutes
        errorMessage: "Too many OTP requests for this email",
      },
      {
        key: `otp_ip_${ip}`,
        limit: 20,
        window: 60 * 60, // 1 hour
        errorMessage: "Too many OTP requests from this IP address",
      },
    ]

    return await rateLimiter.checkMultipleRules(rules)
  } catch (error) {
    // Log the error but don't block the request if rate limiting fails
    await pipelineLogger.logError(requestId, "AUTH_MIDDLEWARE", `OTP rate limit error: ${error.message}`, false, {
      email,
      ip,
    })

    // If it's a rate limit error, rethrow it
    if (error.name === "RateLimitError") {
      throw error
    }

    // Otherwise, allow the request to proceed
    return {
      success: true,
      remaining: 100,
      reset: Date.now() + 60 * 1000,
      limit: 100,
    }
  }
}

export async function requireAuth(req: NextRequest): Promise<any> {
  const requestId = req.headers.get("X-Request-ID") || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const authHeader = req.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("Authentication required")
    }

    const token = authHeader.split(" ")[1]

    if (!token) {
      throw new AuthenticationError("Invalid token format")
    }

    // Verify the token
    const payload = await authSystem.verifyToken(token)

    // Get the user from the database to ensure they still exist
    const user = await authSystem.getUserById(payload.userId)

    if (!user) {
      throw new AuthenticationError("User not found")
    }

    return { user, payload }
  } catch (error) {
    await pipelineLogger.logWarning(requestId, "AUTH_MIDDLEWARE", `Authentication failed: ${error.message}`, {
      path: req.nextUrl.pathname,
    })

    throw new AuthenticationError(error.message || "Authentication failed")
  }
}

export async function requireAdmin(req: NextRequest): Promise<any> {
  const { user } = await requireAuth(req)

  if (user.role !== "admin") {
    throw new AuthorizationError("Admin access required")
  }

  return { user }
}

export async function checkRateLimit(req: NextRequest, identifier: string, rules: any[] = []): Promise<any> {
  try {
    const defaultRules = [
      {
        key: `general_${identifier}`,
        limit: 100,
        window: 3600, // 1 hour
        errorMessage: "Rate limit exceeded",
      },
    ]

    const rateLimitRules = rules.length > 0 ? rules : defaultRules
    return await rateLimiter.checkMultipleRules(rateLimitRules)
  } catch (error) {
    // Log error but don't block request
    console.error("Rate limit check failed:", error)
    return {
      success: true,
      remaining: 100,
      reset: Date.now() + 3600000,
      limit: 100,
    }
  }
}
