import { databaseService, type AnalyticsEvent } from "./database-service"

export class AnalyticsEngine {
  async trackEvent(event: Omit<AnalyticsEvent, "id" | "timestamp">): Promise<void> {
    try {
      const analyticsEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...event,
      }

      // Store in database with new schema
      await databaseService.createAnalyticsEvent({
        ...analyticsEvent,
        category: event.metadata?.category || "general",
        action: event.endpoint || event.type,
      })
    } catch (error) {
      console.warn('Analytics tracking failed:', error)
      // Fail silently during build or when database unavailable
    }
  }

  async getSystemMetrics(): Promise<any> {
    try {
      const dbMetrics = await databaseService.getSystemMetrics()

      return {
        activeUsers: dbMetrics.activeUsers,
        apiCalls: dbMetrics.apiCalls,
        errorRate: dbMetrics.errorRate,
        avgResponseTime: dbMetrics.avgResponseTime,
        pipelineJobs: dbMetrics.pipelineJobs,
        totalUsers: dbMetrics.totalUsers,
        agentStatus: {
          "code-generator": "active",
          "voice-processor": "active",
        "image-analyzer": "active",
        "search-crawler": "active",
        "deployment-bot": Math.random() > 0.3 ? "active" : "inactive",
        "security-scanner": "active",
      },
    }
    } catch (error) {
      console.warn('Failed to get system metrics:', error)
      return {
        activeUsers: 0,
        apiCalls: 0,
        errorRate: 0,
        avgResponseTime: 0,
        pipelineJobs: 0,
        totalUsers: 0,
        agentStatus: {
          "code-generator": "unknown",
          "voice-processor": "unknown",
          "image-analyzer": "unknown",
          "search-crawler": "unknown", 
          "deployment-bot": "unknown",
          "security-scanner": "unknown",
        },
      }
    }
  }

  async getRecentEvents(limit = 50): Promise<AnalyticsEvent[]> {
    try {
      return await databaseService.getRecentAnalyticsEvents(limit)
    } catch (error) {
      console.warn('Failed to get recent events:', error)
      return []
    }
  }

  async getEventsByType(type: AnalyticsEvent["type"], limit = 20): Promise<AnalyticsEvent[]> {
    try {
      return await databaseService.getAnalyticsEventsByType(type, limit)
    } catch (error) {
      console.warn('Failed to get events by type:', error)
      return []
    }
  }

  async getAnalyticsByCategory(category: string, hours = 24): Promise<any[]> {
    try {
      const result = await databaseService.sql`
        SELECT * FROM analytics_events 
        WHERE category = ${category} 
        AND timestamp > NOW() - INTERVAL '${hours} hours'
        ORDER BY timestamp DESC 
        LIMIT 100
      `
      return result
    } catch (error) {
      console.warn('Failed to get analytics by category:', error)
      return []
    }
  }

  async getTopEndpoints(limit = 10): Promise<any[]> {
    try {
      const result = await databaseService.sql`
        SELECT endpoint, COUNT(*) as request_count, AVG(duration) as avg_duration
        FROM analytics_events 
        WHERE endpoint IS NOT NULL 
        AND timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY endpoint 
        ORDER BY request_count DESC 
        LIMIT ${limit}
      `
      return result
    } catch (error) {
      console.warn('Failed to get top endpoints:', error)
      return []
    }
  }
}

export const analyticsEngine = new AnalyticsEngine()
