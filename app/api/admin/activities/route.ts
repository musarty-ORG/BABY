import type { NextRequest } from "next/server"
import { withErrorHandler } from "@/lib/error-handler"
import { requireAdmin } from "@/lib/auth-middleware"
import { analyticsEngine } from "@/lib/analytics-engine"

export const dynamic = "force-dynamic"

export const GET = withErrorHandler(async (req: NextRequest) => {
  // Return early if database is not configured
  if (!process.env.NEON_NEON_DATABASE_URL) {
    return Response.json({
      success: true,
      activities: [],
      total: 0,
      message: "Database not configured"
    })
  }

  await requireAdmin(req)

  const url = new URL(req.url)
  const limit = Number.parseInt(url.searchParams.get("limit") || "50")
  const severity = url.searchParams.get("severity")

  let events = await analyticsEngine.getRecentEvents(limit)

  if (severity) {
    events = events.filter((event) => {
      const eventSeverity =
        event.status_code && event.status_code >= 400
          ? "error"
          : event.status_code && event.status_code >= 300
            ? "warning"
            : "info"
      return eventSeverity === severity
    })
  }

  const activities = events.map((event) => ({
    id: event.id,
    user: event.user_id || "System",
    action: event.type.replace("_", " ").toUpperCase(),
    timestamp: new Date(event.timestamp).toLocaleString(),
    details: event.endpoint || event.metadata?.action || "System operation",
    severity:
      event.status_code && event.status_code >= 400
        ? "error"
        : event.status_code && event.status_code >= 300
          ? "warning"
          : "info",
  }))

  await analyticsEngine.trackEvent({
    type: "api_call",
    endpoint: "/api/admin/activities",
    method: "GET",
    status_code: 200,
  })

  return Response.json({
    success: true,
    activities,
    total: activities.length,
  })
})
