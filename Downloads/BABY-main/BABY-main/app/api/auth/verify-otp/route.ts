import type { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/error-handler'
import { otpVerificationSchema } from '@/lib/validation-schemas'
import { authSystem } from '@/lib/auth-system'
import { emailService } from '@/lib/email-service'
import { checkLoginRateLimit } from '@/lib/auth-middleware'
import { analyticsEngine } from '@/lib/analytics-engine'

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { email, otp } = otpVerificationSchema.parse(await req.json())

  // Check rate limiting for login attempts
  await checkLoginRateLimit(req, email)

  const isValid = await authSystem.verifyOTP(email, otp)

  if (!isValid) {
    // Track failed login attempt
    await analyticsEngine.trackEvent({
      type: 'login_failed',
      user_email: email,
      metadata: {
        reason: 'invalid_otp',
        clientIP: req.headers.get('x-forwarded-for') || 'unknown',
      },
    })

    return Response.json(
      {
        success: false,
        message: 'Invalid or expired OTP',
      },
      { status: 400 }
    )
  }

  // Get or create user
  const user = await authSystem.getOrCreateUser(email)
  const isNewUser = !user.lastLoginAt

  // Create session
  const sessionId = await authSystem.createSession(user)

  // Send welcome email for new users
  if (isNewUser) {
    await emailService.sendWelcomeEmail(email, user.name)
  }

  // Send security alert for existing users
  if (!isNewUser) {
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown'
    await emailService.sendSecurityAlert(email, 'Successful login', clientIP)
  }

  // Track successful login
  await analyticsEngine.trackEvent({
    type: 'login_success',
    user_id: user.id,
    user_email: email,
    metadata: {
      isNewUser,
      clientIP: req.headers.get('x-forwarded-for') || 'unknown',
    },
  })

  return Response.json({
    success: true,
    message: 'Login successful',
    sessionId,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isNewUser,
    },
  })
})
