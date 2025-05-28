import type { NextRequest } from "next/server"
import { withErrorHandler } from "@/lib/error-handler"
import { requireAdmin } from "@/lib/auth-middleware"
import { analyticsEngine } from "@/lib/analytics-engine"
import { authSystem } from "@/lib/auth"

export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const [systemMetrics, userStats, subscriptionMetrics, tokenMetrics] = await Promise.all([
    analyticsEngine.getSystemMetrics(),
    authSystem.getUserStats(),
    analyticsEngine.getSubscriptionMetrics(),
    analyticsEngine.getTokenUsageMetrics(),
  ])

  const metrics = [
    {
      id: "total_users",
      name: "TOTAL USERS",
      value: userStats.totalUsers,
      unit: "",
      trend: "stable",
      status: "healthy",
    },
    {
      id: "active_users",
      name: "ACTIVE USERS",
      value: userStats.activeUsers,
      unit: "",
      trend: "up",
      status: "healthy",
    },
    {
      id: "api_requests",
      name: "API REQUESTS",
      value: systemMetrics.apiCalls,
      unit: "/hr",
      trend: "up",
      status: "healthy",
    },
    {
      id: "error_rate",
      name: "ERROR RATE",
      value: systemMetrics.errorRate,
      unit: "%",
      trend: systemMetrics.errorRate > 5 ? "up" : "stable",
      status: systemMetrics.errorRate > 10 ? "critical" : systemMetrics.errorRate > 5 ? "warning" : "healthy",
    },
    {
      id: "avg_response_time",
      name: "AVG RESPONSE TIME",
      value: systemMetrics.avgResponseTime,
      unit: "ms",
      trend: systemMetrics.avgResponseTime > 1000 ? "up" : "stable",
      status: systemMetrics.avgResponseTime > 2000 ? "warning" : "healthy",
    },
    {
      id: "pipeline_jobs",
      name: "PIPELINE JOBS",
      value: systemMetrics.pipelineJobs,
      unit: "",
      trend: "stable",
      status: "healthy",
    },
    {
      id: "active_subscriptions",
      name: "ACTIVE SUBSCRIPTIONS",
      value: subscriptionMetrics.activeSubscriptions,
      unit: "",
      trend: "up",
      status: "healthy",
    },
    {
      id: "monthly_revenue",
      name: "MONTHLY REVENUE",
      value: subscriptionMetrics.revenue,
      unit: "$",
      trend: "up",
      status: "healthy",
    },
    {
      id: "tokens_used",
      name: "TOKENS USED",
      value: tokenMetrics.totalTokensUsed,
      unit: "",
      trend: "up",
      status: "healthy",
    },
    {
      id: "new_users_today",
      name: "NEW USERS TODAY",
      value: userStats.newUsersToday,
      unit: "",
      trend: "stable",
      status: "healthy",
    },
  ]

  await analyticsEngine.trackEvent({
    type: "admin_action",
    metadata: {
      action: "view_metrics",
      endpoint: "/api/admin/metrics",
      method: "GET",
      status_code: 200,
    },
  })

  return Response.json({
    success: true,
    metrics,
    systemMetrics,
    userStats,
    subscriptionMetrics,
    tokenMetrics,
  })
})
