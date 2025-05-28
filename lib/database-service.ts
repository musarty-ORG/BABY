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

export class DatabaseService {
  // Set RLS context for the current user
  async setUserContext(userId: string): Promise<void> {
    await sql`SELECT set_current_user_id(${userId})`
  }

  // Clear RLS context
  async clearUserContext(): Promise<void> {
    await sql`SELECT set_config('app.current_user_id', '', true)`
  }

  // User operations
  async createUser(user: Omit<User, "created_at" | "last_login">): Promise<User> {
    // Clear context for user creation (system operation)
    await this.clearUserContext()

    const result = await sql`
      INSERT INTO users (id, email, name, role, status, metadata)
      VALUES (${user.id}, ${user.email}, ${user.name || null}, ${user.role}, ${user.status}, ${JSON.stringify(user.metadata || {})})
      RETURNING *
    `
    return this.mapUserRow(result[0])
  }

  async getUserByEmail(email: string): Promise<User | null> {
    // Clear context for authentication (system operation)
    await this.clearUserContext()

    const result = await sql`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `
    return result.length > 0 ? this.mapUserRow(result[0]) : null
  }

  async getUserById(id: string): Promise<User | null> {
    // Set context to allow user to view their own profile
    await this.setUserContext(id)

    const result = await sql`
      SELECT * FROM users WHERE id::text = ${id} LIMIT 1
    `
    return result.length > 0 ? this.mapUserRow(result[0]) : null
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    await this.setUserContext(id)

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
      values.push(JSON.stringify(updates.metadata || {}))
    }

    if (setClause.length === 0) return null

    const result = await sql`
      UPDATE users 
      SET ${sql.unsafe(setClause.join(", "))}, last_login = CURRENT_TIMESTAMP
      WHERE id::text = ${id}
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
    // Admin operation - clear context to bypass RLS
    await this.clearUserContext()

    const result = await sql`
      SELECT * FROM users 
      ORDER BY last_login DESC 
      LIMIT ${limit} OFFSET ${offset}
    `
    return result.map(this.mapUserRow)
  }

  async searchUsers(query: string, limit = 20): Promise<User[]> {
    await this.clearUserContext()

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
    await this.clearUserContext()

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

  // Token Ledger operations with RLS
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

    // Get user's current plan and subscription info
    const userResult = await sql`
      SELECT plan, metadata->>'subscription_id' as subscription_id FROM users WHERE id::text = ${userId}
    `

    if (userResult.length === 0) {
      throw new Error("User not found")
    }

    const user = userResult[0]

    // Calculate total balance
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

  // Vaulted Payment Method operations with RLS
  async createVaultedPaymentMethod(
    method: Omit<VaultedPaymentMethod, "created_at" | "updated_at">,
  ): Promise<VaultedPaymentMethod> {
    await this.setUserContext(method.user_id)

    const result = await sql`
      INSERT INTO vaulted_payment_methods (
        id, user_id, paypal_vault_id, payment_type, last_digits, brand, 
        card_type, expiry, paypal_email, is_default, metadata
      )
      VALUES (
        ${method.id}, ${method.user_id}, ${method.paypal_vault_id}, ${method.payment_type},
        ${method.last_digits || null}, ${method.brand || null}, ${method.card_type || null},
        ${method.expiry || null}, ${method.paypal_email || null}, ${method.is_default},
        ${JSON.stringify(method.metadata || {})}
      )
      RETURNING *
    `
    return this.mapVaultedPaymentMethodRow(result[0])
  }

  async getVaultedPaymentMethodsByUserId(userId: string): Promise<VaultedPaymentMethod[]> {
    await this.setUserContext(userId)

    const result = await sql`
      SELECT * FROM vaulted_payment_methods 
      WHERE user_id = ${userId}
      ORDER BY is_default DESC, created_at DESC
    `
    return result.map(this.mapVaultedPaymentMethodRow)
  }

  async deleteVaultedPaymentMethod(id: string, userId: string): Promise<void> {
    await this.setUserContext(userId)

    await sql`
      DELETE FROM vaulted_payment_methods WHERE id = ${id} AND user_id = ${userId}
    `
  }

  async setDefaultPaymentMethod(userId: string, methodId: string): Promise<void> {
    await this.setUserContext(userId)

    // First, unset all default methods for this user
    await sql`
      UPDATE vaulted_payment_methods 
      SET is_default = false 
      WHERE user_id = ${userId}
    `

    // Then set the new default
    await sql`
      UPDATE vaulted_payment_methods 
      SET is_default = true 
      WHERE id = ${methodId} AND user_id = ${userId}
    `
  }

  // PayPal Customer operations with RLS
  async createPayPalCustomer(customer: Omit<PayPalCustomer, "created_at">): Promise<PayPalCustomer> {
    await this.clearUserContext()

    const result = await sql`
      INSERT INTO paypal_customers (id, user_id, paypal_customer_id, metadata)
      VALUES (${customer.id}, ${customer.user_id}, ${customer.paypal_customer_id}, ${JSON.stringify(customer.metadata || {})})
      RETURNING *
    `
    return this.mapPayPalCustomerRow(result[0])
  }

  async getPayPalCustomerByUserId(userId: string): Promise<PayPalCustomer | null> {
    await this.setUserContext(userId)

    const result = await sql`
      SELECT * FROM paypal_customers WHERE user_id = ${userId} LIMIT 1
    `
    return result.length > 0 ? this.mapPayPalCustomerRow(result[0]) : null
  }

  // Subscription operations with RLS
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

  async updateSubscription(
    subscriptionId: string,
    updates: {
      status?: string
      metadata?: any
    },
  ): Promise<any> {
    await this.clearUserContext()

    const setClause = []

    if (updates.status !== undefined) {
      setClause.push(`status = '${updates.status}'`)
    }
    if (updates.metadata !== undefined) {
      setClause.push(`metadata = '${JSON.stringify(updates.metadata)}'`)
    }

    if (setClause.length === 0) return null

    const result = await sql`
      UPDATE subscriptions 
      SET ${sql.unsafe(setClause.join(", "))}, updated_at = CURRENT_TIMESTAMP
      WHERE paypal_subscription_id = ${subscriptionId}
      RETURNING *
    `
    return result.length > 0 ? result[0] : null
  }

  async getSubscriptionByPayPalId(paypalSubscriptionId: string): Promise<any> {
    await this.clearUserContext()

    const result = await sql`
      SELECT * FROM subscriptions WHERE paypal_subscription_id = ${paypalSubscriptionId} LIMIT 1
    `
    return result.length > 0 ? result[0] : null
  }

  async getUserSubscription(userId: string): Promise<any> {
    await this.setUserContext(userId)

    const result = await sql`
      SELECT * FROM subscriptions WHERE user_id = ${userId} AND status = 'active' LIMIT 1
    `
    return result.length > 0 ? result[0] : null
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

  // Helper methods for new types
  private mapPayPalCustomerRow(row: any): PayPalCustomer {
    return {
      id: row.id,
      user_id: row.user_id,
      paypal_customer_id: row.paypal_customer_id,
      created_at: row.created_at,
      metadata: row.metadata || {},
    }
  }

  private mapVaultedPaymentMethodRow(row: any): VaultedPaymentMethod {
    return {
      id: row.id,
      user_id: row.user_id,
      paypal_vault_id: row.paypal_vault_id,
      payment_type: row.payment_type,
      last_digits: row.last_digits,
      brand: row.brand,
      card_type: row.card_type,
      expiry: row.expiry,
      paypal_email: row.paypal_email,
      is_default: row.is_default,
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata: row.metadata || {},
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
}

export const databaseService = new DatabaseService()
