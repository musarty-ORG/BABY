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
      { userId, requiredTokens },
    )

    // Return conservative values on error
    return {
      balance: 0,
      hasEnoughTokens: false,
      requiredTokens,
    }
  }
}

export async function deductTokens(userId: string, amount: number): Promise<TokenBalance> {
  const requestId = `token_deduct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const result = await databaseService.query(
      `UPDATE users 
       SET token_balance = GREATEST(0, token_balance - $2)
       WHERE id = $1
       RETURNING token_balance`,
      [userId, amount],
    )

    if (result.rows.length === 0) {
      throw new Error(`User not found: ${userId}`)
    }

    const newBalance = result.rows[0].token_balance

    // Log the token deduction
    await databaseService.query(
      `INSERT INTO token_ledger (user_id, amount, type, description, balance_after)
       VALUES ($1, $2, 'debit', $3, $4)`,
      [userId, amount, `Token usage`, newBalance],
    )

    await pipelineLogger.logInfo(
      requestId,
      "TOKEN_BALANCE",
      `Deducted ${amount} tokens from user ${userId}. New balance: ${newBalance}`,
    )

    return {
      balance: newBalance,
      hasEnoughTokens: newBalance > 0,
      requiredTokens: amount,
    }
  } catch (error) {
    await pipelineLogger.logError(requestId, "TOKEN_BALANCE", `Failed to deduct tokens: ${error.message}`, false, {
      userId,
      amount,
    })

    throw error
  }
}

export async function addTokens(userId: string, amount: number, description = "Token purchase"): Promise<TokenBalance> {
  const requestId = `token_add_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const result = await databaseService.query(
      `UPDATE users 
       SET token_balance = token_balance + $2
       WHERE id = $1
       RETURNING token_balance`,
      [userId, amount],
    )

    if (result.rows.length === 0) {
      throw new Error(`User not found: ${userId}`)
    }

    const newBalance = result.rows[0].token_balance

    // Log the token addition
    await databaseService.query(
      `INSERT INTO token_ledger (user_id, amount, type, description, balance_after)
       VALUES ($1, $2, 'credit', $3, $4)`,
      [userId, amount, description, newBalance],
    )

    await pipelineLogger.logInfo(
      requestId,
      "TOKEN_BALANCE",
      `Added ${amount} tokens to user ${userId}. New balance: ${newBalance}`,
    )

    return {
      balance: newBalance,
      hasEnoughTokens: true,
      requiredTokens: 0,
    }
  } catch (error) {
    await pipelineLogger.logError(requestId, "TOKEN_BALANCE", `Failed to add tokens: ${error.message}`, false, {
      userId,
      amount,
    })

    throw error
  }
}
