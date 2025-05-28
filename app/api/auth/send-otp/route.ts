import type { NextRequest } from "next/server"
import { withErrorHandler, ValidationError } from "@/lib/error-handler"
import { otpRequestSchema } from "@/lib/validation-schemas"
import { authSystem } from "@/lib/auth-system"
import { emailService } from "@/lib/email-service"
import { checkOTPRateLimit } from "@/lib/auth-middleware"
import { analyticsEngine } from "@/lib/analytics-engine"

export const POST = withErrorHandler(async (req: NextRequest) => {
  try {
    // Parse and validate request body
    const body = await req.json().catch(() => {
      throw new ValidationError("Invalid JSON in request body")
    })

    const validatedData = otpRequestSchema.safeParse(body)
    if (!validatedData.success) {
      throw new ValidationError(validatedData.error.errors.map((e) => e.message).join(", "))
    }

    const { email, name, isSignup } = validatedData.data

    // Check rate limiting for OTP requests
    const rateLimitResult = await checkOTPRateLimit(req, email)

    // Generate OTP
    const otp = await authSystem.generateOTP(email)

    // Send OTP via email
    let emailSent = false
    try {
      emailSent = await emailService.sendOTP(email, otp)
    } catch (emailError) {
      console.error(`[AUTH] Failed to send OTP email to ${email}:`, emailError)
      // Continue without failing - we don't want to reveal email delivery issues
    }

    // Track OTP request
    try {
      await analyticsEngine.trackEvent({
        type: "otp_request",
        user_email: email,
        metadata: {
          emailSent,
          isSignup: !!isSignup,
          rateLimitRemaining: rateLimitResult.remaining,
          clientIP: req.headers.get("x-forwarded-for") || "unknown",
        },
      })
    } catch (analyticsError) {
      console.error("[AUTH] Failed to track OTP request:", analyticsError)
      // Continue without failing
    }

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
  } catch (error) {
    console.error("[AUTH] Send OTP error:", error)

    // Re-throw known errors to be handled by withErrorHandler
    if (error instanceof ValidationError) {
      throw error
    }

    // For unknown errors, throw a generic error
    throw new Error("Failed to send OTP. Please try again.")
  }
})
