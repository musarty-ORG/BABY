// This script can be run to verify all services are properly configured
// Run with: npx tsx scripts/verify-setup.ts

import { emailService } from "../lib/email-service"
import { rateLimiter } from "../lib/rate-limiter"
import { databaseService } from "../lib/database-service"

async function verifySetup() {
  console.log("🔍 Verifying Code Homie setup...\n")

  const checks = []

  // Check environment variables
  console.log("📋 Checking environment variables...")
  const requiredEnvVars = [
    "GROQ_API_KEY",
    "NEON_NEON_DATABASE_URL",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "API_SECRET_KEY",
  ]

  const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])

  if (missingEnvVars.length === 0) {
    console.log("✅ All required environment variables are set")
    checks.push(true)
  } else {
    console.log(`❌ Missing environment variables: ${missingEnvVars.join(", ")}`)
    checks.push(false)
  }

  // Check email service
  console.log("\n📧 Testing email service...")
  try {
    const emailHealthy = await emailService.testConnection()
    if (emailHealthy) {
      console.log("✅ Email service connection verified")
      checks.push(true)
    } else {
      console.log("❌ Email service connection failed")
      checks.push(false)
    }
  } catch (error) {
    console.log(`❌ Email service error: ${error.message}`)
    checks.push(false)
  }

  // Check Redis/Rate limiting
  console.log("\n🔄 Testing Redis/Rate limiting...")
  try {
    const result = await rateLimiter.checkLimit({
      identifier: "setup_test",
      limit: 100,
      window: 60,
    })
    console.log("✅ Redis connection and rate limiting verified")
    console.log(`   Rate limit remaining: ${result.remaining}`)
    checks.push(true)
  } catch (error) {
    console.log(`❌ Redis error: ${error.message}`)
    checks.push(false)
  }

  // Check database
  console.log("\n🗄️  Testing database connection...")
  try {
    const dbHealthy = await databaseService.healthCheck()
    if (dbHealthy) {
      console.log("✅ Database connection verified")
      checks.push(true)
    } else {
      console.log("❌ Database connection failed")
      checks.push(false)
    }
  } catch (error) {
    console.log(`❌ Database error: ${error.message}`)
    checks.push(false)
  }

  // Summary
  const passedChecks = checks.filter(Boolean).length
  const totalChecks = checks.length

  console.log(`\n📊 Setup verification complete: ${passedChecks}/${totalChecks} checks passed`)

  if (passedChecks === totalChecks) {
    console.log("🎉 All systems are ready! Code Homie is production-ready.")
    console.log("\n🚀 Next steps:")
    console.log("   1. Deploy to Vercel")
    console.log("   2. Test the application")
    console.log("   3. Monitor logs and metrics")
  } else {
    console.log("⚠️  Some systems need attention before going to production.")
    console.log("   Please fix the failed checks above.")
  }

  process.exit(passedChecks === totalChecks ? 0 : 1)
}

// Run verification if this script is executed directly
if (require.main === module) {
  verifySetup().catch((error) => {
    console.error("❌ Setup verification failed:", error)
    process.exit(1)
  })
}

export { verifySetup }
