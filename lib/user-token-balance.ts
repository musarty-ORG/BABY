import { databaseService } from "./database-service"
import { pipelineLogger } from "./pipeline-logger"

export interface TokenBalance {
  balance: number
  hasEnoughTokens: boolean
  requiredTokens: number
}

export async function checkUserTokenBalance(userId: string, requiredTokens = 1): Promise<TokenBalance> {
  const requestId = `token_check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const result = await databaseService.query(`SELECT token_balance FROM users WHERE id = $1`, [userId])

    if (result.rows.length === 0) {
      await pipelineLogger.logWarning(requestId, "TOKEN_BALANCE", `User not found: ${userId}`)

      return {
        balance: 0,
        hasEnoughTokens: false,
        requiredTokens,
      }
    }

    const balance = result.rows[0].token_balance || 0
    const hasEnoughTokens = balance >= requiredTokens

    await pipelineLogger.logInfo(
      requestId,
      "TOKEN_BALANCE",
      `Token check for user ${userId}: ${balance}/${requiredTokens} (sufficient: ${hasEnoughTokens})`,
    )

    return {
      balance,
      hasEnoughTokens,
      requiredTokens,
    }
  } catch (error) {
    await pipelineLogger.logError(
      requestId,
      "TOKEN_BALANCE",
      `Failed to check token balance: ${error.message}`,
      false,
      {
        userId,
        requiredTokens,
      },
    )

    // Return conservative values on error
    return {
      balance: 0,
      hasEnoughTokens: false,
      requiredTokens,
    }
  }
}
