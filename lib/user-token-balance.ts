import { neon } from "@neondatabase/serverless"

let sql: ReturnType<typeof neon> | null = null

function getSql() {
  if (!sql) {
    sql = neon(process.env.NEON_NEON_DATABASE_URL!)
  }
  return sql
}

export async function checkUserTokenBalance(userId: string): Promise<{
  hasTokens: boolean
  balance: number
  needsTopup: boolean
  plan: string
}> {
  try {
    if (!userId) {
      return { hasTokens: false, balance: 0, needsTopup: true, plan: "free" }
    }

    const users = await getSql()`
      SELECT token_balance, subscription_plan, subscription_status
      FROM users 
      WHERE id = ${userId}
    `

    if (users.length === 0) {
      return { hasTokens: false, balance: 0, needsTopup: true, plan: "free" }
    }

    const user = users[0]
    const balance = user.token_balance || 0
    const plan = user.subscription_plan || "free"
    const hasActiveSubscription = user.subscription_status === "active"

    // Users with active subscriptions get unlimited tokens
    if (hasActiveSubscription && plan !== "free") {
      return {
        hasTokens: true,
        balance: balance,
        needsTopup: false,
        plan: plan,
      }
    }

    // Free users need tokens
    const hasTokens = balance > 0
    const needsTopup = balance < 10 // Warn when balance is low

    return {
      hasTokens,
      balance,
      needsTopup,
      plan,
    }
  } catch (error) {
    console.error("Check user token balance error:", error)
    return { hasTokens: false, balance: 0, needsTopup: true, plan: "free" }
  }
}

export async function deductTokens(userId: string, amount: number, operation = "api_call"): Promise<boolean> {
  try {
    // Check if user has active subscription (unlimited tokens)
    const users = await getSql()`
      SELECT token_balance, subscription_status, subscription_plan
      FROM users 
      WHERE id = ${userId}
    `

    if (users.length === 0) {
      return false
    }

    const user = users[0]

    // Users with active subscriptions don't need to deduct tokens
    if (user.subscription_status === "active" && user.subscription_plan !== "free") {
      // Log the usage but don't deduct tokens
      await getSql()`
        INSERT INTO token_transactions (user_id, amount, operation_type, transaction_type, timestamp)
        VALUES (${userId}, ${amount}, ${operation}, 'usage', NOW())
      `
      return true
    }

    // Check if user has enough tokens
    if (user.token_balance < amount) {
      return false
    }

    // Deduct tokens
    await getSql()`
      UPDATE users 
      SET 
        token_balance = token_balance - ${amount},
        updated_at = NOW()
      WHERE id = ${userId}
    `

    // Log the transaction
    await getSql()`
      INSERT INTO token_transactions (user_id, amount, operation_type, transaction_type, timestamp)
      VALUES (${userId}, ${amount}, ${operation}, 'deduction', NOW())
    `

    return true
  } catch (error) {
    console.error("Deduct tokens error:", error)
    return false
  }
}

export async function addTokens(userId: string, amount: number, source = "purchase"): Promise<boolean> {
  try {
    await getSql()`
      UPDATE users 
      SET 
        token_balance = token_balance + ${amount},
        updated_at = NOW()
      WHERE id = ${userId}
    `

    // Log the transaction
    await getSql()`
      INSERT INTO token_transactions (user_id, amount, operation_type, transaction_type, timestamp)
      VALUES (${userId}, ${amount}, ${source}, 'addition', NOW())
    `

    return true
  } catch (error) {
    console.error("Add tokens error:", error)
    return false
  }
}

export async function getTokenTransactionHistory(userId: string, limit = 50) {
  try {
    const transactions = await getSql()`
      SELECT amount, operation_type, transaction_type, timestamp
      FROM token_transactions 
      WHERE user_id = ${userId}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `

    return transactions
  } catch (error) {
    console.error("Get token transaction history error:", error)
    return []
  }
}

export async function getTokenUsageStats(userId: string) {
  try {
    // Get current balance
    const balance = await checkUserTokenBalance(userId)

    // Get today's usage
    const today = new Date().toISOString().split("T")[0]
    const todayUsage = await getSql()`
      SELECT SUM(amount) as tokens_used
      FROM token_transactions 
      WHERE user_id = ${userId} 
        AND transaction_type = 'deduction'
        AND DATE(timestamp) = ${today}
    `

    // Get this month's usage
    const thisMonth = new Date().toISOString().substring(0, 7)
    const monthlyUsage = await getSql()`
      SELECT SUM(amount) as tokens_used
      FROM token_transactions 
      WHERE user_id = ${userId} 
        AND transaction_type = 'deduction'
        AND DATE(timestamp) LIKE ${thisMonth + "%"}
    `

    return {
      currentBalance: balance.balance,
      todayUsage: todayUsage[0]?.tokens_used || 0,
      monthlyUsage: monthlyUsage[0]?.tokens_used || 0,
      hasActiveSubscription: balance.plan !== "free",
      plan: balance.plan,
    }
  } catch (error) {
    console.error("Get token usage stats error:", error)
    return null
  }
}

export const TOKEN_COSTS = {
  chat_message: 1,
  code_generation: 5,
  image_analysis: 3,
  voice_synthesis: 2,
  search_query: 1,
  crawl_operation: 2,
  predictive_analysis: 4,
}

export function getTokenCost(operation: string): number {
  return TOKEN_COSTS[operation as keyof typeof TOKEN_COSTS] || 1
}
