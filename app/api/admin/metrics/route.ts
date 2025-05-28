import type { NextRequest } from "next/server"
import { withErrorHandler } from "@/lib/error-handler"
import { requireAdmin } from "@/lib/auth-middleware"
import { analyticsEngine } from "@/lib/analytics-engine"

export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const systemMetrics = await analyticsEngine.getSystemMetrics()

  const metrics = [
    {
      id: "active_agents",
      name: "ACTIVE AGENTS",
      value: Object.values(systemMetrics.agentStatus).filter((status) => status === "active").length,
      unit: "",
      trend: "stable",
      status: "healthy",
    },
    {
      id: "pipeline_jobs",
      name: "PIPELINE JOBS",
      value: systemMetrics.pipelineJobs,
      unit: "",
      trend: "up",
      status: "healthy",
    },
    {
      id: "api_requests",
      name: "API REQUESTS",
      value: systemMetrics.apiCalls,
      unit: "",
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
      id: "total_users",
      name: "TOTAL USERS",
      value: systemMetrics.totalUsers,
      unit: "",
      trend: "stable",
      status: "healthy",
    },
  ]

  await analyticsEngine.trackEvent({
    type: "api_call",
    endpoint: "/api/admin/metrics",
    method: "GET",
    status_code: 200,
  })

  return Response.json({
    success: true,
    metrics,
  })
})
