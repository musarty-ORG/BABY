import { databaseService, type AnalyticsEvent } from "./database-service"

export class AnalyticsEngine {
  async trackEvent(event: Omit<AnalyticsEvent, "id" | "timestamp">): Promise<void> {
    const analyticsEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...event,
    }

    // Store in database
    await databaseService.createAnalyticsEvent(analyticsEvent)
  }

  async getSystemMetrics(): Promise<any> {
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
  }

  async getRecentEvents(limit = 50): Promise<AnalyticsEvent[]> {
    return await databaseService.getRecentAnalyticsEvents(limit)
  }

  async getEventsByType(type: AnalyticsEvent["type"], limit = 20): Promise<AnalyticsEvent[]> {
    return await databaseService.getAnalyticsEventsByType(type, limit)
  }
}

export const analyticsEngine = new AnalyticsEngine()
