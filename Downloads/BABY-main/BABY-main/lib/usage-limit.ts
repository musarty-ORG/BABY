import { neon } from '@neondatabase/serverless'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

const sql = neon(process.env.NEON_NEON_DATABASE_URL!)

// Usage limits per plan
const USAGE_LIMITS = {
  free: 10,
  basic: 100,
  builder: 500,
  architect: 2000,
}

export async function incrementUsageCount(
  userId?: string,
  operation = 'api_call',
  tokens = 1
): Promise<void> {
  try {
    let userIdToUse = userId

    if (!userIdToUse) {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        throw new Error('No user session found')
      }
      userIdToUse = session.user.id
    }

    // Get current date for daily usage tracking
    const today = new Date().toISOString().split('T')[0]

    // Check if usage record exists for today
    const existingUsage = await sql`
      SELECT id, usage_count, tokens_used
      FROM daily_usage 
      WHERE user_id = ${userIdToUse} AND date = ${today}
    `

    if (existingUsage.length > 0) {
      // Update existing record
      await sql`
        UPDATE daily_usage 
        SET 
          usage_count = usage_count + 1,
          tokens_used = tokens_used + ${tokens},
          updated_at = NOW()
        WHERE user_id = ${userIdToUse} AND date = ${today}
      `
    } else {
      // Create new record
      await sql`
        INSERT INTO daily_usage (user_id, date, usage_count, tokens_used, operation_type)
        VALUES (${userIdToUse}, ${today}, 1, ${tokens}, ${operation})
      `
    }

    // Also log the specific operation
    await sql`
      INSERT INTO usage_logs (user_id, operation_type, tokens_used, timestamp)
      VALUES (${userIdToUse}, ${operation}, ${tokens}, NOW())
    `
  } catch (error) {
    console.error('Increment usage count error:', error)
    throw error
  }
}

export async function checkUsageCount(userId?: string): Promise<boolean> {
  try {
    let userIdToCheck = userId

    if (!userIdToCheck) {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return false
      }
      userIdToCheck = session.user.id
    }

    // Get user's subscription plan
    const users = await sql`
      SELECT subscription_plan, subscription_status
      FROM users 
      WHERE id = ${userIdToCheck}
    `

    if (users.length === 0) {
      return false
    }

    const user = users[0]
    const plan = user.subscription_plan || 'free'
    const limit =
      USAGE_LIMITS[plan as keyof typeof USAGE_LIMITS] || USAGE_LIMITS.free

    // If user has active subscription, they have higher limits
    if (user.subscription_status === 'active' && plan !== 'free') {
      // Get today's usage
      const today = new Date().toISOString().split('T')[0]
      const usage = await sql`
        SELECT usage_count
        FROM daily_usage 
        WHERE user_id = ${userIdToCheck} AND date = ${today}
      `

      const currentUsage = usage.length > 0 ? usage[0].usage_count : 0
      return currentUsage < limit
    }

    // For free users, check daily limit
    const today = new Date().toISOString().split('T')[0]
    const usage = await sql`
      SELECT usage_count
      FROM daily_usage 
      WHERE user_id = ${userIdToCheck} AND date = ${today}
    `

    const currentUsage = usage.length > 0 ? usage[0].usage_count : 0
    return currentUsage < USAGE_LIMITS.free
  } catch (error) {
    console.error('Check usage count error:', error)
    return false
  }
}

export async function getUserUsageStats(userId: string) {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Get today's usage
    const todayUsage = await sql`
      SELECT usage_count, tokens_used
      FROM daily_usage 
      WHERE user_id = ${userId} AND date = ${today}
    `

    // Get this month's usage
    const thisMonth = new Date().toISOString().substring(0, 7) // YYYY-MM
    const monthlyUsage = await sql`
      SELECT SUM(usage_count) as total_calls, SUM(tokens_used) as total_tokens
      FROM daily_usage 
      WHERE user_id = ${userId} AND date LIKE ${thisMonth + '%'}
    `

    // Get user's plan and limits
    const users = await sql`
      SELECT subscription_plan, subscription_status
      FROM users 
      WHERE id = ${userId}
    `

    const user = users[0]
    const plan = user?.subscription_plan || 'free'
    const limit =
      USAGE_LIMITS[plan as keyof typeof USAGE_LIMITS] || USAGE_LIMITS.free

    return {
      today: {
        calls: todayUsage.length > 0 ? todayUsage[0].usage_count : 0,
        tokens: todayUsage.length > 0 ? todayUsage[0].tokens_used : 0,
      },
      monthly: {
        calls: monthlyUsage[0]?.total_calls || 0,
        tokens: monthlyUsage[0]?.total_tokens || 0,
      },
      limits: {
        daily: limit,
        plan: plan,
      },
      canMakeRequest: await checkUsageCount(userId),
    }
  } catch (error) {
    console.error('Get usage stats error:', error)
    return null
  }
}

export async function resetDailyUsage(userId: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0]

    await sql`
      DELETE FROM daily_usage 
      WHERE user_id = ${userId} AND date = ${today}
    `

    return true
  } catch (error) {
    console.error('Reset daily usage error:', error)
    return false
  }
}
