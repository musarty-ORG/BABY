import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_NEON_DATABASE_URL!)

export interface User {
  id: string
  email: string
  name?: string
  role: "admin" | "user" | "moderator"
  status: "active" | "inactive" | "suspended"
  created_at: string
  last_login: string
  metadata?: Record<string, any>
}

export interface AnalyticsEvent {
  id: string
  type: "api_call" | "user_action" | "system_event" | "error"
  user_id?: string
  endpoint?: string
  method?: string
  status_code?: number
  duration?: number
  user_agent?: string
  ip_address?: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface PipelineJob {
  id: string
  user_id?: string
  job_type: string
  status: "pending" | "running" | "completed" | "failed"
  input_data?: Record<string, any>
  output_data?: Record<string, any>
  error_message?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

export class DatabaseService {
  // User operations
  async createUser(user: Omit<User, "created_at" | "last_login">): Promise<User> {
    const result = await sql`
      INSERT INTO users (id, email, name, role, status, metadata)
      VALUES (${user.id}, ${user.email}, ${user.name || null}, ${user.role}, ${user.status}, ${JSON.stringify(user.metadata || {})})
      RETURNING *
    `
    return this.mapUserRow(result[0])
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `
    return result.length > 0 ? this.mapUserRow(result[0]) : null
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await sql`
      SELECT * FROM users WHERE id = ${id} LIMIT 1
    `
    return result.length > 0 ? this.mapUserRow(result[0]) : null
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const setClause = []
    const values = []

    if (updates.name !== undefined) {
      setClause.push(`name = $${setClause.length + 1}`)
      values.push(updates.name)
    }
    if (updates.role !== undefined) {
      setClause.push(`role = $${setClause.length + 1}`)
      values.push(updates.role)
    }
    if (updates.status !== undefined) {
      setClause.push(`status = $${setClause.length + 1}`)
      values.push(updates.status)
    }
    if (updates.metadata !== undefined) {
      setClause.push(`metadata = $${setClause.length + 1}`)
      values.push(JSON.stringify(updates.metadata))
    }

    if (setClause.length === 0) return null

    const result = await sql`
      UPDATE users 
      SET ${sql.unsafe(setClause.join(", "))}, last_login = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `
    return result.length > 0 ? this.mapUserRow(result[0]) : null
  }

  async updateUserLastLogin(email: string): Promise<void> {
    await sql`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE email = ${email}
    `
  }

  async getAllUsers(limit = 100, offset = 0): Promise<User[]> {
    const result = await sql`
      SELECT * FROM users 
      ORDER BY last_login DESC 
      LIMIT ${limit} OFFSET ${offset}
    `
    return result.map(this.mapUserRow)
  }

  async searchUsers(query: string, limit = 20): Promise<User[]> {
    const result = await sql`
      SELECT * FROM users 
      WHERE name ILIKE ${`%${query}%`} OR email ILIKE ${`%${query}%`}
      ORDER BY last_login DESC 
      LIMIT ${limit}
    `
    return result.map(this.mapUserRow)
  }

  // Analytics operations
  async createAnalyticsEvent(event: Omit<AnalyticsEvent, "timestamp">): Promise<void> {
    await sql`
      INSERT INTO analytics_events (
        id, type, user_id, endpoint, method, status_code, 
        duration, user_agent, ip_address, metadata
      )
      VALUES (
        ${event.id}, ${event.type}, ${event.user_id || null}, 
        ${event.endpoint || null}, ${event.method || null}, 
        ${event.status_code || null}, ${event.duration || null}, 
        ${event.user_agent || null}, ${event.ip_address || null}, 
        ${JSON.stringify(event.metadata || {})}
      )
    `
  }

  async getRecentAnalyticsEvents(limit = 50): Promise<AnalyticsEvent[]> {
    const result = await sql`
      SELECT * FROM analytics_events 
      ORDER BY timestamp DESC 
      LIMIT ${limit}
    `
    return result.map(this.mapAnalyticsEventRow)
  }

  async getAnalyticsEventsByType(type: string, limit = 20): Promise<AnalyticsEvent[]> {
    const result = await sql`
      SELECT * FROM analytics_events 
      WHERE type = ${type}
      ORDER BY timestamp DESC 
      LIMIT ${limit}
    `
    return result.map(this.mapAnalyticsEventRow)
  }

  async getSystemMetrics(): Promise<any> {
    // Get recent metrics
    const [totalUsers, activeUsers, recentApiCalls, recentErrors, avgResponseTime, activePipelineJobs] =
      await Promise.all([
        sql`SELECT COUNT(*) as count FROM users`,
        sql`SELECT COUNT(*) as count FROM users WHERE last_login > NOW() - INTERVAL '24 hours'`,
        sql`SELECT COUNT(*) as count FROM analytics_events WHERE timestamp > NOW() - INTERVAL '1 hour'`,
        sql`SELECT COUNT(*) as count FROM analytics_events WHERE status_code >= 400 AND timestamp > NOW() - INTERVAL '1 hour'`,
        sql`SELECT AVG(duration) as avg_duration FROM analytics_events WHERE duration IS NOT NULL AND timestamp > NOW() - INTERVAL '1 hour'`,
        sql`SELECT COUNT(*) as count FROM pipeline_jobs WHERE status IN ('pending', 'running')`,
      ])

    const totalApiCalls = Number(recentApiCalls[0]?.count || 0)
    const errorCount = Number(recentErrors[0]?.count || 0)

    return {
      totalUsers: Number(totalUsers[0]?.count || 0),
      activeUsers: Number(activeUsers[0]?.count || 0),
      apiCalls: totalApiCalls,
      errorRate: totalApiCalls > 0 ? (errorCount / totalApiCalls) * 100 : 0,
      avgResponseTime: Math.round(Number(avgResponseTime[0]?.avg_duration || 0)),
      pipelineJobs: Number(activePipelineJobs[0]?.count || 0),
    }
  }

  // Pipeline job operations
  async createPipelineJob(job: Omit<PipelineJob, "created_at" | "updated_at">): Promise<PipelineJob> {
    const result = await sql`
      INSERT INTO pipeline_jobs (id, user_id, job_type, status, input_data, output_data, error_message)
      VALUES (
        ${job.id}, ${job.user_id || null}, ${job.job_type}, ${job.status}, 
        ${JSON.stringify(job.input_data || {})}, ${JSON.stringify(job.output_data || {})}, 
        ${job.error_message || null}
      )
      RETURNING *
    `
    return this.mapPipelineJobRow(result[0])
  }

  async updatePipelineJob(id: string, updates: Partial<PipelineJob>): Promise<PipelineJob | null> {
    const setClause = []
    const values = []

    if (updates.status !== undefined) {
      setClause.push(`status = $${setClause.length + 1}`)
      values.push(updates.status)
    }
    if (updates.output_data !== undefined) {
      setClause.push(`output_data = $${setClause.length + 1}`)
      values.push(JSON.stringify(updates.output_data))
    }
    if (updates.error_message !== undefined) {
      setClause.push(`error_message = $${setClause.length + 1}`)
      values.push(updates.error_message)
    }
    if (updates.status === "completed" || updates.status === "failed") {
      setClause.push(`completed_at = CURRENT_TIMESTAMP`)
    }

    if (setClause.length === 0) return null

    const result = await sql`
      UPDATE pipeline_jobs 
      SET ${sql.unsafe(setClause.join(", "))}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `
    return result.length > 0 ? this.mapPipelineJobRow(result[0]) : null
  }

  async getPipelineJobsByUser(userId: string, limit = 20): Promise<PipelineJob[]> {
    const result = await sql`
      SELECT * FROM pipeline_jobs 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `
    return result.map(this.mapPipelineJobRow)
  }

  // Audit log operations
  async createAuditLog(log: {
    id: string
    request_id: string
    stage: string
    input_data?: any
    output_data?: any
    duration?: number
    metadata?: any
  }): Promise<void> {
    await sql`
      INSERT INTO audit_logs (id, request_id, stage, input_data, output_data, duration, metadata)
      VALUES (
        ${log.id}, ${log.request_id}, ${log.stage}, 
        ${JSON.stringify(log.input_data || {})}, ${JSON.stringify(log.output_data || {})}, 
        ${log.duration || null}, ${JSON.stringify(log.metadata || {})}
      )
    `
  }

  async getAuditLogsByRequestId(requestId: string): Promise<any[]> {
    const result = await sql`
      SELECT * FROM audit_logs 
      WHERE request_id = ${requestId}
      ORDER BY timestamp ASC
    `
    return result.map((row) => ({
      ...row,
      input_data: row.input_data || {},
      output_data: row.output_data || {},
      metadata: row.metadata || {},
    }))
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await sql`SELECT 1 as health_check`
      return result.length > 0 && result[0].health_check === 1
    } catch (error) {
      console.error("Database health check failed:", error)
      return false
    }
  }

  // Project Context operations
  async createProjectContext(context: Omit<any, "id" | "created_at" | "updated_at">): Promise<any> {
    const result = await sql`
      INSERT INTO project_contexts (
        user_id, name, type, framework, description, goals, target_audience, 
        business_logic, current_phase, tech_stack, code_style, user_preferences,
        repository_url, deployment_url
      )
      VALUES (
        ${context.user_id}, ${context.name}, ${context.type}, ${context.framework || null},
        ${context.description || null}, ${JSON.stringify(context.goals || [])},
        ${context.target_audience || null}, ${JSON.stringify(context.business_logic || [])},
        ${context.current_phase || "planning"}, ${JSON.stringify(context.tech_stack || [])},
        ${JSON.stringify(context.code_style || {})}, ${JSON.stringify(context.user_preferences || {})},
        ${context.repository_url || null}, ${context.deployment_url || null}
      )
      RETURNING *
    `
    return result[0]
  }

  async getProjectContextsByUser(userId: string): Promise<any[]> {
    const result = await sql`
      SELECT * FROM project_contexts 
      WHERE user_id = ${userId} AND is_active = true
      ORDER BY updated_at DESC
    `
    return result
  }

  // Email logging
  async logEmail(log: {
    recipient_email: string
    subject: string
    template_name?: string
    status: string
    provider_message_id?: string
    error_message?: string
    metadata?: any
  }): Promise<void> {
    await sql`
      INSERT INTO email_logs (
        recipient_email, subject, template_name, status, 
        provider_message_id, error_message, metadata, sent_at
      )
      VALUES (
        ${log.recipient_email}, ${log.subject}, ${log.template_name || null},
        ${log.status}, ${log.provider_message_id || null}, ${log.error_message || null},
        ${JSON.stringify(log.metadata || {})}, 
        ${log.status === "sent" ? "CURRENT_TIMESTAMP" : null}
      )
    `
  }

  // System metrics
  async recordSystemMetric(metric: {
    metric_name: string
    metric_value: number
    metric_unit?: string
    category: string
    tags?: any
  }): Promise<void> {
    await sql`
      INSERT INTO system_metrics (metric_name, metric_value, metric_unit, category, tags)
      VALUES (
        ${metric.metric_name}, ${metric.metric_value}, ${metric.metric_unit || null},
        ${metric.category}, ${JSON.stringify(metric.tags || {})}
      )
    `
  }

  // Search query logging
  async logSearchQuery(query: {
    user_id?: string
    query: string
    search_type?: string
    results_count: number
    response_time: number
    success: boolean
    error_message?: string
    metadata?: any
  }): Promise<void> {
    await sql`
      INSERT INTO search_queries (
        user_id, query, search_type, results_count, response_time,
        success, error_message, metadata
      )
      VALUES (
        ${query.user_id || null}, ${query.query}, ${query.search_type || "general"},
        ${query.results_count}, ${query.response_time}, ${query.success},
        ${query.error_message || null}, ${JSON.stringify(query.metadata || {})}
      )
    `
  }

  // Helper methods
  private mapUserRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      status: row.status,
      created_at: row.created_at,
      last_login: row.last_login,
      metadata: row.metadata || {},
    }
  }

  private mapAnalyticsEventRow(row: any): AnalyticsEvent {
    return {
      id: row.id,
      type: row.type,
      user_id: row.user_id,
      endpoint: row.endpoint,
      method: row.method,
      status_code: row.status_code,
      duration: row.duration,
      user_agent: row.user_agent,
      ip_address: row.ip_address,
      timestamp: row.timestamp,
      metadata: row.metadata || {},
    }
  }

  private mapPipelineJobRow(row: any): PipelineJob {
    return {
      id: row.id,
      user_id: row.user_id,
      job_type: row.job_type,
      status: row.status,
      input_data: row.input_data || {},
      output_data: row.output_data || {},
      error_message: row.error_message,
      created_at: row.created_at,
      updated_at: row.updated_at,
      completed_at: row.completed_at,
    }
  }
}

export const databaseService = new DatabaseService()
