import { type NextRequest, NextResponse } from "next/server"
import { withErrorHandler } from "@/lib/error-handler"
import { requireAdmin } from "@/lib/auth-middleware"
import { authSystem } from "@/lib/auth-system"
import { analyticsEngine } from "@/lib/analytics-engine"
import { databaseService } from "@/lib/database-service"

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await requireAdmin(req)

  const user = await authSystem.getUserById(params.id)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Get user's token balance and subscription info
  const [tokenBalance, subscription, tokenHistory] = await Promise.all([
    databaseService.getUserTokenBalance(params.id).catch(() => null),
    databaseService.getUserSubscription(params.id).catch(() => null),
    databaseService.getUserTokenLedgerHistory(params.id, 20).catch(() => []),
  ])

  await analyticsEngine.trackEvent({
    type: "admin_action",
    metadata: {
      action: "view_user_details",
      target_user_id: params.id,
      endpoint: `/api/admin/users/${params.id}`,
      method: "GET",
      status_code: 200,
    },
  })

  return Response.json({
    success: true,
    user: {
      ...user,
      tokenBalance: tokenBalance?.total_balance || 0,
      subscription: subscription || null,
      tokenHistory: tokenHistory || [],
    },
  })
})

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await requireAdmin(req)

  const body = await req.json()
  const { action, status, role, tokenDelta } = body

  let success = false
  let message = ""

  switch (action) {
    case "suspend":
      success = await authSystem.updateUserStatus(params.id, "suspended")
      message = "User suspended successfully"
      break
    case "activate":
      success = await authSystem.updateUserStatus(params.id, "active")
      message = "User activated successfully"
      break
    case "deactivate":
      success = await authSystem.updateUserStatus(params.id, "inactive")
      message = "User deactivated successfully"
      break
    case "update_role":
      if (role) {
        success = await authSystem.updateUserRole(params.id, role)
        message = `User role updated to ${role}`
      }
      break
    case "adjust_tokens":
      if (tokenDelta) {
        try {
          await databaseService.createTokenLedgerEntry({
            id: `admin_${Date.now()}`,
            user_id: params.id,
            delta: Number(tokenDelta),
            reason: "Admin adjustment",
            metadata: { admin_action: true },
          })
          success = true
          message = `Token balance adjusted by ${tokenDelta}`
        } catch (error) {
          success = false
          message = "Failed to adjust token balance"
        }
      }
      break
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  if (!success) {
    return NextResponse.json({ error: message || "Action failed" }, { status: 500 })
  }

  await analyticsEngine.trackEvent({
    type: "admin_action",
    metadata: {
      action: `user_${action}`,
      target_user_id: params.id,
      endpoint: `/api/admin/users/${params.id}`,
      method: "PATCH",
      status_code: 200,
    },
  })

  return Response.json({
    success: true,
    message,
  })
})

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  await requireAdmin(req)

  // In a real app, you might want to soft delete or archive the user
  // For now, we'll just mark them as suspended
  const success = await authSystem.updateUserStatus(params.id, "suspended")

  if (!success) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }

  await analyticsEngine.trackEvent({
    type: "admin_action",
    metadata: {
      action: "delete_user",
      target_user_id: params.id,
      endpoint: `/api/admin/users/${params.id}`,
      method: "DELETE",
      status_code: 200,
    },
  })

  return Response.json({
    success: true,
    message: "User deleted successfully",
  })
})
