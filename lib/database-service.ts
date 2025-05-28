import { neon } from "@neondatabase/serverless"

// Use the correct environment variable
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
  type: string
  user_id?: string
  endpoint?: string
  method?: string
  status_code?: number
  duration?: number
  user_agent?: string
  ip_address?: string
  timestamp: string
  metadata?: Record<string, any>
  category?: string
  action?: string
  session_id?: string
  browser?: string
  os?: string
  device_type?: string
  city?: string
  country_code?: string
  referrer?: string
}

export interface TokenLedgerEntry {
  id: string
  user_id: string
  delta: number
  reason: string
  created_at: string
  metadata?: Record<string, any>
}

export interface UserTokenBalance {
  user_id: string
  total_balance: number
  monthly_balance: number
  topup_balance: number
  plan: string
  subscription_id: string | null
}

export interface VaultedPaymentMethod {
  id: string
  user_id: string
  paypal_vault_id: string
  payment_type: "card" | "paypal"
  last_digits?: string
  brand?: string
  card_type?: string
  expiry?: string
  paypal_email?: string
  is_default: boolean
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface PayPalCustomer {
  id: string
  user_id: string
  paypal_customer_id: string
  created_at: string
  metadata?: Record<string, any>
}

export interface UsageTracking {
  id: number
  user_id: string
  usage_type: string
  usage_date: string
  count: number
  created_at: string
  updated_at: string
}

export class DatabaseService {
  // Set RLS context for the current user
  async setUserContext(userId: string): Promise<void> {
    try {
      await sql`SELECT set_current_user_id(${userId})`
    } catch (error) {
      console.warn("Failed to set user context:", error.message)
    }
  }

  // Clear RLS context
  async clearUserContext(): Promise<void> {
    try {
      await sql`SELECT set_config('app.current_user_id', '', true)`
    } catch (error) {
      console.warn("Failed to clear user context:", error.message)
    }
  }

  // User operations
  async createUser(user: Omit<User, "created_at" | "last_login">): Promise<User> {
    await this.clearUserContext()

    const result = await sql`
      INSERT INTO users (id, email, name, role, status, metadata)
      VALUES (${user.id}::uuid, ${user.email}, ${user.name || null}, ${user.role}, ${user.status}, ${JSON.stringify(user.metadata || {})})
      RETURNING *
    `
    return this.mapUserRow(result[0])
  }

  async getUserByEmail(email: string): Promise<User | null> {
    await this.clearUserContext()

    const result = await sql`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `
    return result.length > 0 ? this.mapUserRow(result[0]) : null
  }

  async getUserById(id: string): Promise<User | null> {
    await this.setUserContext(id)

    const result = await sql`
      SELECT * FROM users WHERE id = ${id}::uuid LIMIT 1
    `
    return result.length > 0 ? this.mapUserRow(result[0]) : null
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    await this.setUserContext(id)

    const setClause = []
    const values = []

    if (updates.name !== undefined) {
      setClause.push(`name = $${setClause.length + 2}`)
      values.push(updates.name)
    }
    if (updates.role !== undefined) {
      setClause.push(`role = $${setClause.length + 2}`)
      values.push(updates.role)
    }
    if (updates.status !== undefined) {
      setClause.push(`status = $${setClause.length + 2}`)
      values.push(updates.status)
    }
    if (updates.metadata !== undefined) {
      setClause.push(`metadata = $${setClause.length + 2}`)
      values.push(JSON.stringify(updates.metadata || {}))
    }

    if (setClause.length === 0) return null

    const result = await sql`
      UPDATE users 
      SET ${sql.unsafe(setClause.join(", "))}, last_login = CURRENT_TIMESTAMP
      WHERE id = ${id}::uuid
      RETURNING *
    `
    return result.length > 0 ? this.mapUserRow(result[0]) : null
  }

  async updateUserLastLogin(email: string): Promise<void> {
    await this.clearUserContext()
    await sql`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE email = ${email}
    `
  }

  async getAllUsers(limit = 100, offset = 0): Promise<User[]> {
    await this.clearUserContext()

    const result = await sql`
      SELECT * FROM users 
      ORDER BY last_login DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `
    return result.map(this.mapUserRow)
  }

  async searchUsers(query: string, limit = 20): Promise<User[]> {
    await this.clearUserContext()

    const result = await sql`
      SELECT * FROM users 
      WHERE name ILIKE ${`%${query}%`} OR email ILIKE ${`%${query}%`}
      ORDER BY last_login DESC NULLS LAST
      LIMIT ${limit}
    `
    return result.map(this.mapUserRow)
  }

  // Analytics operations using your actual schema
  async createAnalyticsEvent(event: Omit<AnalyticsEvent, "timestamp">): Promise<void> {
    await this.clearUserContext()

    await sql`
      INSERT INTO analytics_events (
        id, type, user_id, endpoint, method, status_code, 
        duration, user_agent, ip_address, metadata, category,
        action, session_id, browser, os, device_type, city,
        country_code, referrer
      )
      VALUES (
        ${event.id}::uuid, ${event.type}, ${event.user_id ? `${event.user_id}::uuid` : null}, 
        ${event.endpoint || null}, ${event.method || null}, 
        ${event.status_code || null}, ${event.duration || null}, 
        ${event.user_agent || null}, ${event.ip_address || null}, 
        ${JSON.stringify(event.metadata || {})}, ${event.category || null},
        ${event.action || null}, ${event.session_id ? `${event.session_id}::uuid` : null},
        ${event.browser || null}, ${event.os || null}, ${event.device_type || null},
        ${event.city || null}, ${event.country_code || null}, ${event.referrer || null}
      )
    `
  }

  async getRecentAnalyticsEvents(limit = 50): Promise<AnalyticsEvent[]> {
    await this.clearUserContext()

    const result = await sql`
      SELECT * FROM analytics_events 
      ORDER BY timestamp DESC 
      LIMIT ${limit}
    `
    return result.map(this.mapAnalyticsEventRow)
  }

  async getAnalyticsEventsByType(type: string, limit = 20): Promise<AnalyticsEvent[]> {
    await this.clearUserContext()

    const result = await sql`
      SELECT * FROM analytics_events 
      WHERE type = ${type}
      ORDER BY timestamp DESC 
      LIMIT ${limit}
    `
    return result.map(this.mapAnalyticsEventRow)
  }

  async getSystemMetrics(): Promise<any> {
    await this.clearUserContext()

    try {
      const [totalUsers, activeUsers, recentApiCalls, recentErrors, avgResponseTime] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM users`,
        sql`SELECT COUNT(*) as count FROM users WHERE last_login > NOW() - INTERVAL '24 hours'`,
        sql`SELECT COUNT(*) as count FROM analytics_events WHERE timestamp > NOW() - INTERVAL '1 hour'`,
        sql`SELECT COUNT(*) as count FROM analytics_events WHERE status_code >= 400 AND timestamp > NOW() - INTERVAL '1 hour'`,
        sql`SELECT AVG(duration) as avg_duration FROM analytics_events WHERE duration IS NOT NULL AND timestamp > NOW() - INTERVAL '1 hour'`,
      ])

      const totalApiCalls = Number(recentApiCalls[0]?.count || 0)
      const errorCount = Number(recentErrors[0]?.count || 0)

      return {
        totalUsers: Number(totalUsers[0]?.count || 0),
        activeUsers: Number(activeUsers[0]?.count || 0),
        apiCalls: totalApiCalls,
        errorRate: totalApiCalls > 0 ? (errorCount / totalApiCalls) * 100 : 0,
        avgResponseTime: Math.round(Number(avgResponseTime[0]?.avg_duration || 0)),
        pipelineJobs: 0, // No pipeline_jobs table in your schema
      }
    } catch (error) {
      console.error("Error getting system metrics:", error)
      return {
        totalUsers: 0,
        activeUsers: 0,
        apiCalls: 0,
        errorRate: 0,
        avgResponseTime: 0,
        pipelineJobs: 0,
      }
    }
  }

  // Token Ledger operations
  async createTokenLedgerEntry(entry: Omit<TokenLedgerEntry, "created_at">): Promise<TokenLedgerEntry> {
    await this.clearUserContext()

    const result = await sql`
      INSERT INTO token_ledger (id, user_id, delta, reason, metadata)
      VALUES (${entry.id}, ${entry.user_id}, ${entry.delta}, ${entry.reason}, ${JSON.stringify(entry.metadata || {})})
      RETURNING *
    `
    return this.mapTokenLedgerRow(result[0])
  }

  async getUserTokenBalance(userId: string): Promise<UserTokenBalance> {
    await this.setUserContext(userId)

    try {
      // Get user's current plan and subscription info
      const userResult = await sql`
        SELECT plan, metadata->>'subscription_id' as subscription_id FROM users WHERE id = ${userId}::uuid
      `

      if (userResult.length === 0) {
        throw new Error("User not found")
      }

      const user = userResult[0]

      // Calculate total balance from token_ledger
      const balanceResult = await sql`
        SELECT 
          COALESCE(SUM(delta), 0) as total_balance,
          COALESCE(SUM(CASE WHEN metadata->>'type' = 'monthly' THEN delta ELSE 0 END), 0) as monthly_balance,
          COALESCE(SUM(CASE WHEN metadata->>'type' = 'topup' THEN delta ELSE 0 END), 0) as topup_balance
        FROM token_ledger 
        WHERE user_id = ${userId}
      `

      const balance = balanceResult[0]

      return {
        user_id: userId,
        total_balance: Number(balance.total_balance),
        monthly_balance: Number(balance.monthly_balance),
        topup_balance: Number(balance.topup_balance),
        plan: user.plan || "none",
        subscription_id: user.subscription_id,
      }
    } catch (error) {
      console.error("Error getting token balance:", error)
      return {
        user_id: userId,
        total_balance: 0,
        monthly_balance: 0,
        topup_balance: 0,
        plan: "none",
        subscription_id: null,
      }
    }
  }

  async getUserTokenLedgerHistory(userId: string, limit = 50): Promise<TokenLedgerEntry[]> {
    await this.setUserContext(userId)

    const result = await sql`
      SELECT * FROM token_ledger 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `
    return result.map(this.mapTokenLedgerRow)
  }

  // Usage tracking operations
  async createUsageEntry(userId: string, usageType: string, count = 1): Promise<UsageTracking> {
    await this.clearUserContext()

    const today = new Date().toISOString().split("T")[0]

    const result = await sql`
      INSERT INTO usage_tracking (user_id, usage_type, usage_date, count)
      VALUES (${userId}, ${usageType}, ${today}, ${count})
      ON CONFLICT (user_id, usage_type, usage_date)
      DO UPDATE SET 
        count = usage_tracking.count + ${count},
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `

    return this.mapUsageTrackingRow(result[0])
  }

  async getUserUsage(userId: string, usageType: string, date?: string): Promise<UsageTracking | null> {
    await this.setUserContext(userId)

    const targetDate = date || new Date().toISOString().split("T")[0]

    const result = await sql`
      SELECT * FROM usage_tracking 
      WHERE user_id = ${userId} AND usage_type = ${usageType} AND usage_date = ${targetDate}
      LIMIT 1
    `

    return result.length > 0 ? this.mapUsageTrackingRow(result[0]) : null
  }

  // Subscription operations
  async createSubscription(subscription: {
    id: string
    user_id: string
    plan_id: string
    paypal_subscription_id: string
    status: string
    metadata?: any
  }): Promise<any> {
    await this.clearUserContext()

    const result = await sql`
      INSERT INTO subscriptions (id, user_id, plan_id, paypal_subscription_id, status, metadata)
      VALUES (${subscription.id}, ${subscription.user_id}, ${subscription.plan_id}, 
              ${subscription.paypal_subscription_id}, ${subscription.status}, 
              ${JSON.stringify(subscription.metadata || {})})
      RETURNING *
    `
    return result[0]
  }

  async getAllSubscriptions(limit = 50, status?: string): Promise<any[]> {
    await this.clearUserContext()

    let query
    if (status) {
      query = sql`
        SELECT 
          s.*,
          u.email,
          u.name
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id::text
        WHERE s.status = ${status}
        ORDER BY s.created_at DESC 
        LIMIT ${limit}
      `
    } else {
      query = sql`
        SELECT 
          s.*,
          u.email,
          u.name
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id::text
        ORDER BY s.created_at DESC 
        LIMIT ${limit}
      `
    }

    return await query
  }

  async getSystemStats(): Promise<{
    totalUsers: number
    activeUsers: number
    totalSubscriptions: number
    activeSubscriptions: number
    totalRevenue: number
    totalTokensUsed: number
  }> {
    await this.clearUserContext()

    try {
      const [
        totalUsersResult,
        activeUsersResult,
        totalSubscriptionsResult,
        activeSubscriptionsResult,
        totalRevenueResult,
        totalTokensResult,
      ] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM users`,
        sql`SELECT COUNT(*) as count FROM users WHERE status = 'active'`,
        sql`SELECT COUNT(*) as count FROM subscriptions`,
        sql`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`,
        sql`SELECT SUM(CAST(metadata->>'amount' AS DECIMAL)) as total FROM subscriptions WHERE status = 'active'`,
        sql`SELECT SUM(ABS(delta)) as total FROM token_ledger WHERE delta < 0`,
      ])

      return {
        totalUsers: Number(totalUsersResult[0]?.count || 0),
        activeUsers: Number(activeUsersResult[0]?.count || 0),
        totalSubscriptions: Number(totalSubscriptionsResult[0]?.count || 0),
        activeSubscriptions: Number(activeSubscriptionsResult[0]?.count || 0),
        totalRevenue: Number(totalRevenueResult[0]?.total || 0),
        totalTokensUsed: Number(totalTokensResult[0]?.total || 0),
      }
    } catch (error) {
      console.error("Error getting system stats:", error)
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        totalRevenue: 0,
        totalTokensUsed: 0,
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.clearUserContext()
      const result = await sql`SELECT 1 as health_check`
      return result.length > 0 && result[0].health_check === 1
    } catch (error) {
      console.error("Database health check failed:", error)
      return false
    }
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
      category: row.category,
      action: row.action,
      session_id: row.session_id,
      browser: row.browser,
      os: row.os,
      device_type: row.device_type,
      city: row.city,
      country_code: row.country_code,
      referrer: row.referrer,
    }
  }

  private mapTokenLedgerRow(row: any): TokenLedgerEntry {
    return {
      id: row.id,
      user_id: row.user_id,
      delta: Number(row.delta),
      reason: row.reason,
      created_at: row.created_at,
      metadata: row.metadata || {},
    }
  }

  private mapUsageTrackingRow(row: any): UsageTracking {
    return {
      id: row.id,
      user_id: row.user_id,
      usage_type: row.usage_type,
      usage_date: row.usage_date,
      count: Number(row.count),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  }

  // Generic query method for flexibility
  async query(text: string, params: any[] = []): Promise<{ rows: any[] }> {
    try {
      const result = await sql.unsafe(text, params)
      return { rows: Array.isArray(result) ? result : [result] }
    } catch (error) {
      console.error("Database query error:", error)
      throw error
    }
  }
}

export const databaseService = new DatabaseService()
