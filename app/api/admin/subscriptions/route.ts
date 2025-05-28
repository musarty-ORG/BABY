import type { NextRequest } from "next/server"
import { withErrorHandler } from "@/lib/error-handler"
import { requireAdmin } from "@/lib/auth-middleware"
import { databaseService } from "@/lib/database-service"
import { analyticsEngine } from "@/lib/analytics-engine"

export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const url = new URL(req.url)
  const status = url.searchParams.get("status")
  const limit = Number.parseInt(url.searchParams.get("limit") || "50")

  try {
    // Get all subscriptions with user details
    const subscriptions = await databaseService.getAllSubscriptions(limit, status)

    await analyticsEngine.trackEvent({
      type: "admin_action",
      metadata: {
        action: "view_subscriptions",
        endpoint: "/api/admin/subscriptions",
        method: "GET",
        status_code: 200,
      },
    })

    return Response.json({
      success: true,
      subscriptions,
      total: subscriptions.length,
    })
  } catch (error) {
    console.error("Error fetching subscriptions:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to fetch subscriptions",
      },
      { status: 500 },
    )
  }
})
