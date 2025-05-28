import type { NextRequest } from "next/server"
import { withErrorHandler } from "@/lib/error-handler"
import { authSystem } from "@/lib/auth-system"

export const POST = withErrorHandler(async (req: NextRequest) => {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")

  if (token) {
    await authSystem.destroySession(token)
  }

  return Response.json({
    success: true,
    message: "Logged out successfully",
  })
})
