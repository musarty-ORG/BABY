import { type NextRequest, NextResponse } from 'next/server'
import { withErrorHandler, ValidationError } from '@/lib/error-handler'
import { emailService } from '@/lib/email-service'
import { requireAdmin } from '@/lib/auth-middleware'
import { z } from 'zod'

const testEmailSchema = z.object({
  email: z.string().email(),
  type: z.enum(['otp', 'welcome', 'security']),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Require admin access for testing
  await requireAdmin(req)

  const { email, type } = testEmailSchema.parse(await req.json())

  let result = false
  let message = ''

  try {
    switch (type) {
      case 'otp':
        result = await emailService.sendOTP(email, '123456')
        message = 'Test OTP email sent'
        break
      case 'welcome':
        result = await emailService.sendWelcomeEmail(email, 'Test User')
        message = 'Test welcome email sent'
        break
      case 'security':
        result = await emailService.sendSecurityAlert(
          email,
          'Test security alert',
          '127.0.0.1'
        )
        message = 'Test security alert sent'
        break
      default:
        throw new ValidationError('Invalid email type')
    }

    return NextResponse.json({
      success: result,
      message: result ? message : 'Email sending failed',
      email,
      type,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Email test failed: ${error.message}`,
        email,
        type,
      },
      { status: 500 }
    )
  }
})
