import { databaseService, type AnalyticsEvent } from './database-service'

export class AnalyticsEngine {
  async trackEvent(
    event: Omit<AnalyticsEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    const analyticsEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...event,
    }

    // Store in database with new schema
    await databaseService.createAnalyticsEvent({
      ...analyticsEvent,
      category: event.metadata?.category || 'general',
      action: event.endpoint || event.type,
    })
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
        'code-generator': 'active',
        'voice-processor': 'active',
        'image-analyzer': 'active',
        'search-crawler': 'active',
        'deployment-bot': Math.random() > 0.3 ? 'active' : 'inactive',
        'security-scanner': 'active',
      },
    }
  }

  async getRecentEvents(limit = 50): Promise<AnalyticsEvent[]> {
    return await databaseService.getRecentAnalyticsEvents(limit)
  }

  async getEventsByType(
    type: AnalyticsEvent['type'],
    limit = 20
  ): Promise<AnalyticsEvent[]> {
    return await databaseService.getAnalyticsEventsByType(type, limit)
  }

  async getAnalyticsByCategory(category: string, hours = 24): Promise<any[]> {
    const result = await databaseService.sql`
      SELECT * FROM analytics_events 
      WHERE category = ${category} 
      AND timestamp > NOW() - INTERVAL '${hours} hours'
      ORDER BY timestamp DESC 
      LIMIT 100
    `
    return result
  }

  async getTopEndpoints(limit = 10): Promise<any[]> {
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
  }
}

export const analyticsEngine = new AnalyticsEngine()
