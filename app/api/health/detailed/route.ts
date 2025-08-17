import { NextResponse } from "next/server"
import { withErrorHandler } from "@/lib/error-handler"
import { emailService } from "@/lib/email-service"
import { rateLimiter } from "@/lib/rate-limiter"
import { databaseService } from "@/lib/database-service"
import { authSystem } from "@/lib/auth-system"

export const GET = withErrorHandler(async () => {
  const startTime = Date.now()
  const checks: Record<string, any> = {}

  // Check email service
  try {
    const emailHealthy = await emailService.testConnection()
    checks.email = {
      status: emailHealthy ? "healthy" : "unhealthy",
      message: emailHealthy ? "SMTP connection verified" : "SMTP connection failed",
    }
  } catch (error) {
    checks.email = {
      status: "unhealthy",
      message: `Email service error: ${error.message}`,
    }
  }

  // Check Redis/Rate Limiting
  try {
    const testResult = await rateLimiter.checkLimit({
      identifier: "health_check",
      limit: 1000,
      window: 60,
    })
    checks.redis = {
      status: "healthy",
      message: "Redis connection verified",
      remaining: testResult.remaining,
    }
  } catch (error) {
    checks.redis = {
      status: "unhealthy",
      message: `Redis error: ${error.message}`,
    }
  }

  // Check Database
  try {
    const dbHealthy = await databaseService.healthCheck()
    checks.database = {
      status: dbHealthy ? "healthy" : "unhealthy",
      message: dbHealthy ? "Database connection verified" : "Database connection failed",
    }
  } catch (error) {
    checks.database = {
      status: "unhealthy",
      message: `Database error: ${error.message}`,
    }
  }

  // Check Auth System
  try {
    // Test OTP generation (without sending)
    const testOtp = await authSystem.generateOTP("health@test.com")
    checks.auth = {
      status: testOtp ? "healthy" : "unhealthy",
      message: testOtp ? "Auth system verified" : "Auth system failed",
    }
  } catch (error) {
    checks.auth = {
      status: "unhealthy",
      message: `Auth system error: ${error.message}`,
    }
  }

  // Check Environment Variables
  const requiredEnvVars = [
    "GROQ_API_KEY",
    "NEON_NEON_DATABASE_URL",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "API_SECRET_KEY",
  ]

  const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])

  checks.environment = {
    status: missingEnvVars.length === 0 ? "healthy" : "unhealthy",
    message:
      missingEnvVars.length === 0
        ? "All required environment variables present"
        : `Missing environment variables: ${missingEnvVars.join(", ")}`,
    missing: missingEnvVars,
  }

  const allHealthy = Object.values(checks).every((check) => check.status === "healthy")
  const responseTime = Date.now() - startTime

  return NextResponse.json({
    status: allHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    version: "1.0.0",
    services: checks,
    summary: {
      total: Object.keys(checks).length,
      healthy: Object.values(checks).filter((check) => check.status === "healthy").length,
      unhealthy: Object.values(checks).filter((check) => check.status === "unhealthy").length,
    },
  })
})
