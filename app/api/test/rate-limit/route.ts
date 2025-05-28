import { type NextRequest, NextResponse } from "next/server"
import { withErrorHandler } from "@/lib/error-handler"
import { rateLimiter, RateLimiter } from "@/lib/rate-limiter"
import { requireAdmin } from "@/lib/auth-middleware"

export const GET = withErrorHandler(async (req: NextRequest) => {
  // Require admin access for testing
  await requireAdmin(req)

  const testIdentifier = `test_${Date.now()}`
  const results: any[] = []

  // Test different rate limiting rules
  const testRules = [
    { name: "OTP_REQUEST", ...RateLimiter.RULES.OTP_REQUEST },
    { name: "API_GENERAL", ...RateLimiter.RULES.API_GENERAL },
    { name: "CHAT_MESSAGE", ...RateLimiter.RULES.CHAT_MESSAGE },
  ]

  for (const rule of testRules) {
    try {
      const result = await rateLimiter.checkLimit({
        identifier: `${testIdentifier}_${rule.name}`,
        limit: rule.limit,
        window: rule.window,
      })

      results.push({
        rule: rule.name,
        status: "success",
        result,
      })
    } catch (error) {
      results.push({
        rule: rule.name,
        status: "error",
        error: error.message,
      })
    }
  }

  // Test rate limit enforcement
  const enforcementTest = {
    identifier: `enforcement_test_${Date.now()}`,
    limit: 2,
    window: 60,
  }

  const enforcementResults = []
  for (let i = 0; i < 4; i++) {
    try {
      const result = await rateLimiter.checkLimit(enforcementTest)
      enforcementResults.push({
        attempt: i + 1,
        success: result.success,
        remaining: result.remaining,
      })
    } catch (error) {
      enforcementResults.push({
        attempt: i + 1,
        success: false,
        error: error.message,
      })
    }
  }

  return NextResponse.json({
    success: true,
    message: "Rate limiting tests completed",
    tests: {
      ruleTests: results,
      enforcementTest: {
        config: enforcementTest,
        results: enforcementResults,
        expectedBehavior: "First 2 attempts should succeed, next 2 should fail",
      },
    },
    timestamp: new Date().toISOString(),
  })
})
