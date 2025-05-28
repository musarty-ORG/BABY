import type { NextRequest } from "next/server"
import { withErrorHandler } from "@/lib/error-handler"
import { otpRequestSchema } from "@/lib/validation-schemas"
import { authSystem } from "@/lib/auth-system"

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { email } = otpRequestSchema.parse(await req.json())

  // Rate limiting check
  const rateLimitKey = `rate_limit:otp:${email}`
  // In production, implement proper rate limiting

  const otp = await authSystem.generateOTP(email)

  // In production, send email with OTP
  // For demo, we'll return it (REMOVE IN PRODUCTION)
  return Response.json({
    success: true,
    message: "OTP sent successfully",
    ...(process.env.NODE_ENV === "development" && { otp }), // Only for development
  })
})
