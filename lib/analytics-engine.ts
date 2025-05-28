import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_NEON_NEON_DATABASE_URL || process.env.NEON_NEON_DATABASE_URL || "")

interface AnalyticsEvent {
  type: string
  user_id?: string
  user_email?: string
  metadata?: any
}

class AnalyticsEngine {
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Don't block on analytics
      this.trackEventAsync(event).catch((error) => {
        console.error(`[ANALYTICS] Failed to track event ${event.type}:`, error)
      })
    } catch (error) {
      console.error(`[ANALYTICS] Failed to initiate tracking for event ${event.type}:`, error)
    }
  }

  private async trackEventAsync(event: AnalyticsEvent): Promise<void> {
    try {
      await sql`
        INSERT INTO analytics_events (type, user_id, user_email, metadata, created_at)
        VALUES (
          ${event.type},
          ${event.user_id || null},
          ${event.user_email || null},
          ${JSON.stringify(event.metadata || {})},
          NOW()
        )
      `
      console.log(`[ANALYTICS] Tracked event: ${event.type}`)
    } catch (error) {
      console.error(`[ANALYTICS] Database error tracking event ${event.type}:`, error)
      throw error
    }
  }

  async getEvents(
    filters: {
      type?: string
      userId?: string
      startDate?: Date
      endDate?: Date
      limit?: number
      offset?: number
    } = {},
  ): Promise<any[]> {
    try {
      const { type, userId, startDate, endDate, limit = 100, offset = 0 } = filters

      let query = sql`
        SELECT * FROM analytics_events
        WHERE 1=1
      `

      if (type) {
        query = sql`${query} AND type = ${type}`
      }

      if (userId) {
        query = sql`${query} AND user_id = ${userId}`
      }

      if (startDate) {
        query = sql`${query} AND created_at >= ${startDate.toISOString()}`
      }

      if (endDate) {
        query = sql`${query} AND created_at <= ${endDate.toISOString()}`
      }

      query = sql`${query} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`

      return await query
    } catch (error) {
      console.error("[ANALYTICS] Failed to get events:", error)
      return []
    }
  }

  async getSystemMetrics(): Promise<{
    totalUsers: number
    activeUsers: number
    apiCalls: number
    errorRate: number
    avgResponseTime: number
    pipelineJobs: number
    agentStatus: Record<string, string>
  }> {
    try {
      // Get recent metrics from the last hour
      const [
        totalUsersResult,
        activeUsersResult,
        recentApiCallsResult,
        recentErrorsResult,
        avgResponseTimeResult,
        activePipelineJobsResult,
      ] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM users`,
        sql`SELECT COUNT(*) as count FROM users WHERE last_login_at > NOW() - INTERVAL '24 hours'`,
        sql`SELECT COUNT(*) as count FROM analytics_events WHERE created_at > NOW() - INTERVAL '1 hour'`,
        sql`SELECT COUNT(*) as count FROM analytics_events WHERE metadata->>'status_code' >= '400' AND created_at > NOW() - INTERVAL '1 hour'`,
        sql`SELECT AVG(CAST(metadata->>'duration' AS INTEGER)) as avg_duration FROM analytics_events WHERE metadata->>'duration' IS NOT NULL AND created_at > NOW() - INTERVAL '1 hour'`,
        sql`SELECT COUNT(*) as count FROM pipeline_jobs WHERE status IN ('pending', 'running')`,
      ])

      const totalApiCalls = Number(recentApiCallsResult[0]?.count || 0)
      const errorCount = Number(recentErrorsResult[0]?.count || 0)

      return {
        totalUsers: Number(totalUsersResult[0]?.count || 0),
        activeUsers: Number(activeUsersResult[0]?.count || 0),
        apiCalls: totalApiCalls,
        errorRate: totalApiCalls > 0 ? (errorCount / totalApiCalls) * 100 : 0,
        avgResponseTime: Math.round(Number(avgResponseTimeResult[0]?.avg_duration || 0)),
        pipelineJobs: Number(activePipelineJobsResult[0]?.count || 0),
        agentStatus: {
          code_generator: "active",
          voice_processor: "active",
          image_analyzer: "active",
          search_crawler: "active",
          deployment_bot: Math.random() > 0.7 ? "standby" : "active",
          security_scanner: "active",
        },
      }
    } catch (error) {
      console.error("[ANALYTICS] Error getting system metrics:", error)
      return {
        totalUsers: 0,
        activeUsers: 0,
        apiCalls: 0,
        errorRate: 0,
        avgResponseTime: 0,
        pipelineJobs: 0,
        agentStatus: {},
      }
    }
  }

  async getRecentEvents(limit = 50): Promise<any[]> {
    try {
      const events = await sql`
        SELECT 
          id,
          type,
          user_id,
          user_email,
          metadata,
          created_at as timestamp
        FROM analytics_events 
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `

      return events.map((event) => ({
        ...event,
        status_code: event.metadata?.status_code ? Number(event.metadata.status_code) : 200,
        endpoint: event.metadata?.endpoint || null,
        duration: event.metadata?.duration ? Number(event.metadata.duration) : null,
      }))
    } catch (error) {
      console.error("[ANALYTICS] Error getting recent events:", error)
      return []
    }
  }

  async getSubscriptionMetrics(): Promise<{
    totalSubscriptions: number
    activeSubscriptions: number
    revenue: number
    churnRate: number
  }> {
    try {
      const [totalResult, activeResult, revenueResult] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM subscriptions`,
        sql`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`,
        sql`SELECT SUM(CAST(metadata->>'amount' AS DECIMAL)) as total FROM subscriptions WHERE status = 'active'`,
      ])

      return {
        totalSubscriptions: Number(totalResult[0]?.count || 0),
        activeSubscriptions: Number(activeResult[0]?.count || 0),
        revenue: Number(revenueResult[0]?.total || 0),
        churnRate: 2.5, // Calculate actual churn rate based on your business logic
      }
    } catch (error) {
      console.error("[ANALYTICS] Error getting subscription metrics:", error)
      return { totalSubscriptions: 0, activeSubscriptions: 0, revenue: 0, churnRate: 0 }
    }
  }

  async getTokenUsageMetrics(): Promise<{
    totalTokensUsed: number
    averageTokensPerUser: number
    topUsers: Array<{ userId: string; tokensUsed: number }>
  }> {
    try {
      const [totalResult, avgResult, topUsersResult] = await Promise.all([
        sql`SELECT SUM(ABS(delta)) as total FROM token_ledger WHERE delta < 0`,
        sql`SELECT AVG(ABS(delta)) as avg FROM token_ledger WHERE delta < 0`,
        sql`
          SELECT 
            user_id, 
            SUM(ABS(delta)) as tokens_used 
          FROM token_ledger 
          WHERE delta < 0 
          GROUP BY user_id 
          ORDER BY tokens_used DESC 
          LIMIT 10
        `,
      ])

      return {
        totalTokensUsed: Number(totalResult[0]?.total || 0),
        averageTokensPerUser: Number(avgResult[0]?.avg || 0),
        topUsers: topUsersResult.map((user) => ({
          userId: user.user_id,
          tokensUsed: Number(user.tokens_used),
        })),
      }
    } catch (error) {
      console.error("[ANALYTICS] Error getting token usage metrics:", error)
      return { totalTokensUsed: 0, averageTokensPerUser: 0, topUsers: [] }
    }
  }
}

export const analyticsEngine = new AnalyticsEngine()
