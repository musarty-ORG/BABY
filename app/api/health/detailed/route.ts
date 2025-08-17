import { NextResponse } from "next/server"
import { withErrorHandler } from "@/lib/error-handler"
import { emailService } from "@/lib/email-service"
import { simpleCounter } from "@/lib/rate-limiter"
import { databaseService } from "@/lib/database-service"
import { anthropicService } from "@/lib/anthropic-service"
import { vertexAISpeechEngine } from "@/lib/vertex-ai-speech-engine"

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

  // Check Counter System
  try {
    const testResult = await simpleCounter.incrementCounter("health_check", simpleCounter.CATEGORIES.API_CALLS)
    checks.counter = {
      status: "healthy",
      message: "Counter system verified",
      count: testResult.count,
    }
  } catch (error) {
    checks.counter = {
      status: "unhealthy",
      message: `Counter system error: ${error.message}`,
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

  // Check Anthropic Service
  try {
    const anthropicTest = await anthropicService.testConnection()
    checks.anthropic = {
      status: anthropicTest.success ? "healthy" : "unhealthy",
      message: anthropicTest.message,
      details: anthropicTest.details,
    }
  } catch (error) {
    checks.anthropic = {
      status: "unhealthy",
      message: `Anthropic service error: ${error.message}`,
    }
  }

  // Check Vertex AI Service
  try {
    const vertexTest = await vertexAISpeechEngine.testConnection()
    checks.vertexAI = {
      status: vertexTest.success ? "healthy" : "unhealthy",
      message: vertexTest.message,
      details: vertexTest.details,
    }
  } catch (error) {
    checks.vertexAI = {
      status: "unhealthy",
      message: `Vertex AI service error: ${error.message}`,
    }
  }

  // Check Environment Variables
  const requiredEnvVars = [
    "NEON_DATABASE_URL",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
  ]

  const optionalEnvVars = [
    "ANTHROPIC_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "VERCEL_TOKEN",
    "GITHUB_TOKEN",
  ]

  const missingRequired = requiredEnvVars.filter((envVar) => !process.env[envVar])
  const availableOptional = optionalEnvVars.filter((envVar) => !!process.env[envVar])

  checks.environment = {
    status: missingRequired.length === 0 ? "healthy" : "unhealthy",
    message:
      missingRequired.length === 0
        ? "All required environment variables present"
        : `Missing required environment variables: ${missingRequired.join(", ")}`,
    missing: missingRequired,
    optional: availableOptional,
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
