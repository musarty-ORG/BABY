import type { NextRequest } from "next/server"
import { withErrorHandler, ValidationError } from "@/lib/error-handler"
import { otpVerifySchema } from "@/lib/validation-schemas"
import { authSystem } from "@/lib/auth-system"

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { email, otp } = otpVerifySchema.parse(await req.json())

  const isValid = await authSystem.verifyOTP(email, otp)

  if (!isValid) {
    throw new ValidationError("Invalid or expired OTP")
  }

  const user = await authSystem.getOrCreateUser(email)
  const sessionId = await authSystem.createSession(user)

  return Response.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    sessionId,
  })
})
