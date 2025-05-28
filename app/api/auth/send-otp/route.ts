import type { NextRequest } from "next/server"
import { withErrorHandler } from "@/lib/error-handler"
import { otpRequestSchema } from "@/lib/validation-schemas"
import { authSystem } from "@/lib/auth-system"
import { emailService } from "@/lib/email-service"
import { checkOTPRateLimit } from "@/lib/auth-middleware"
import { analyticsEngine } from "@/lib/analytics-engine"

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { email } = otpRequestSchema.parse(await req.json())

  // Check rate limiting for OTP requests
  const rateLimitResult = await checkOTPRateLimit(req, email)

  const otp = await authSystem.generateOTP(email)

  // Send OTP via email
  const emailSent = await emailService.sendOTP(email, otp)

  if (!emailSent) {
    console.error(`[AUTH] Failed to send OTP email to ${email}`)
    // Still return success to prevent email enumeration attacks
  }

  // Track OTP request
  await analyticsEngine.trackEvent({
    type: "otp_request",
    user_email: email,
    metadata: {
      emailSent,
      rateLimitRemaining: rateLimitResult.remaining,
      clientIP: req.headers.get("x-forwarded-for") || "unknown",
    },
  })

  return Response.json({
    success: true,
    message: "OTP sent successfully",
    rateLimitRemaining: rateLimitResult.remaining,
    // Only show OTP in development for testing
    ...(process.env.NODE_ENV === "development" && {
      otp,
      emailSent,
      debug: "OTP also logged to console for development",
    }),
  })
})
