import { databaseService } from "./database-service"
import { pipelineLogger } from "./pipeline-logger"

interface UsageCount {
  count: number
  limit: number
  resetTime: Date
}

export async function incrementUsageCount(userId: string, type = "api_call", amount = 1): Promise<UsageCount> {
  const requestId = `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    // Get current usage for today
    const today = new Date().toISOString().split("T")[0]

    const result = await databaseService.query(
      `INSERT INTO usage_tracking (user_id, usage_type, usage_date, count)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, usage_type, usage_date)
       DO UPDATE SET count = usage_tracking.count + $4
       RETURNING count`,
      [userId, type, today, amount],
    )

    const currentCount = result.rows[0]?.count || amount

    // Get user's subscription to determine limits
    const userResult = await databaseService.query(`SELECT role FROM users WHERE id = $1`, [userId])

    const userRole = userResult.rows[0]?.role || "user"
    const limit = getUserLimit(userRole, type)

    await pipelineLogger.logInfo(
      requestId,
      "USAGE_TRACKER",
      `Incremented ${type} usage for user ${userId}: ${currentCount}/${limit}`,
    )

    return {
      count: currentCount,
      limit,
      resetTime: new Date(new Date().setHours(23, 59, 59, 999)), // End of day
    }
  } catch (error) {
    await pipelineLogger.logError(requestId, "USAGE_TRACKER", `Failed to increment usage: ${error.message}`, false, {
      userId,
      type,
      amount,
    })

    // Return conservative values on error
    return {
      count: 1,
      limit: 10,
      resetTime: new Date(new Date().setHours(23, 59, 59, 999)),
    }
  }
}

export async function checkUsageCount(userId: string, type = "api_call"): Promise<UsageCount> {
  const requestId = `check_usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const today = new Date().toISOString().split("T")[0]

    const result = await databaseService.query(
      `SELECT count FROM usage_tracking 
       WHERE user_id = $1 AND usage_type = $2 AND usage_date = $3`,
      [userId, type, today],
    )

    const currentCount = result.rows[0]?.count || 0

    // Get user's role to determine limits
    const userResult = await databaseService.query(`SELECT role FROM users WHERE id = $1`, [userId])

    const userRole = userResult.rows[0]?.role || "user"
    const limit = getUserLimit(userRole, type)

    return {
      count: currentCount,
      limit,
      resetTime: new Date(new Date().setHours(23, 59, 59, 999)),
    }
  } catch (error) {
    await pipelineLogger.logError(requestId, "USAGE_TRACKER", `Failed to check usage: ${error.message}`, false, {
      userId,
      type,
    })

    return {
      count: 0,
      limit: 10,
      resetTime: new Date(new Date().setHours(23, 59, 59, 999)),
    }
  }
}

function getUserLimit(role: string, type: string): number {
  const limits = {
    user: {
      api_call: 100,
      chat_message: 50,
      file_upload: 10,
      ai_generation: 20,
    },
    premium: {
      api_call: 500,
      chat_message: 200,
      file_upload: 50,
      ai_generation: 100,
    },
    admin: {
      api_call: 10000,
      chat_message: 10000,
      file_upload: 1000,
      ai_generation: 1000,
    },
  }

  return limits[role]?.[type] || limits.user[type] || 10
}
