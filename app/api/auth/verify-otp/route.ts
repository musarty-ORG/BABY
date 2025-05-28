import type { NextRequest } from "next/server"
import { withErrorHandler, ValidationError } from "@/lib/error-handler"
import { otpVerificationSchema } from "@/lib/validation-schemas"
import { authSystem } from "@/lib/auth-system"
import { emailService } from "@/lib/email-service"
import { checkLoginRateLimit } from "@/lib/auth-middleware"
import { analyticsEngine } from "@/lib/analytics-engine"

export const POST = withErrorHandler(async (req: NextRequest) => {
  try {
    // Parse and validate request body
    const body = await req.json().catch(() => {
      throw new ValidationError("Invalid JSON in request body")
    })

    const validatedData = otpVerificationSchema.safeParse(body)
    if (!validatedData.success) {
      throw new ValidationError(validatedData.error.errors.map((e) => e.message).join(", "))
    }

    const { email, otp, name, isSignup } = validatedData.data

    // Check rate limiting for login attempts
    await checkLoginRateLimit(req, email)

    // Verify OTP
    const isValid = await authSystem.verifyOTP(email, otp)

    if (!isValid) {
      // Track failed login attempt
      try {
        await analyticsEngine.trackEvent({
          type: "login_failed",
          user_email: email,
          metadata: {
            reason: "invalid_otp",
            clientIP: req.headers.get("x-forwarded-for") || "unknown",
          },
        })
      } catch (analyticsError) {
        console.error("[AUTH] Failed to track failed login:", analyticsError)
      }

      return Response.json(
        {
          success: false,
          error: {
            code: "INVALID_OTP",
            message: "Invalid or expired OTP",
          },
        },
        { status: 400 },
      )
    }

    // Get or create user
    const user = await authSystem.getOrCreateUser(email, name)
    const isNewUser = !user.lastLoginAt

    // Create JWT token
    const token = await authSystem.createSession(user)

    // Send welcome email for new users
    if (isNewUser && isSignup) {
      try {
        await emailService.sendWelcomeEmail(email, user.name || "User")
      } catch (emailError) {
        console.error("[AUTH] Failed to send welcome email:", emailError)
      }
    }

    // Send security alert for existing users (not for new signups)
    if (!isNewUser && !isSignup) {
      try {
        const clientIP = req.headers.get("x-forwarded-for") || "unknown"
        await emailService.sendSecurityAlert(email, "Successful login", clientIP)
      } catch (emailError) {
        console.error("[AUTH] Failed to send security alert:", emailError)
      }
    }

    // Track successful login
    try {
      await analyticsEngine.trackEvent({
        type: "login_success",
        user_id: user.id,
        user_email: email,
        metadata: {
          isNewUser,
          isSignup: !!isSignup,
          clientIP: req.headers.get("x-forwarded-for") || "unknown",
        },
      })
    } catch (analyticsError) {
      console.error("[AUTH] Failed to track successful login:", analyticsError)
    }

    return Response.json({
      success: true,
      message: isSignup ? "Account created successfully" : "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isNewUser,
      },
    })
  } catch (error) {
    console.error("[AUTH] Verify OTP error:", error)

    // Re-throw known errors to be handled by withErrorHandler
    if (error instanceof ValidationError) {
      throw error
    }

    // For unknown errors, throw a generic error
    throw new Error("Failed to verify OTP. Please try again.")
  }
})
