import type { NextRequest } from "next/server"
import { withErrorHandler } from "@/lib/error-handler"
import { requireAuth } from "@/lib/auth-middleware"
import { databaseService } from "@/lib/database-service"

export const GET = withErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth(req)
  const userId = auth.userId

  const user = await databaseService.getUserById(userId)
  if (!user) {
    return Response.json({ success: false, error: "User not found" }, { status: 404 })
  }

  return Response.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    },
  })
})
