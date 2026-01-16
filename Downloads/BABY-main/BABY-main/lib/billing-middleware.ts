import type { NextRequest } from 'next/server'
import { tokenLedger } from './token-ledger'
import { ValidationError } from './error-handler'

export async function billUserForTokens(
  req: NextRequest,
  userId: string,
  tokensUsed: number,
  operation: string
): Promise<void> {
  try {
    await tokenLedger.billUser(
      userId,
      tokensUsed,
      `AI generation: ${operation}`
    )
  } catch (error: any) {
    if (error.message === 'NEED_TOPUP') {
      throw new ValidationError(
        'Insufficient token balance. Please top-up your account or upgrade your plan.',
        'token_balance'
      )
    }
    throw error
  }
}

export async function checkUserTokenBalance(userId: string): Promise<{
  hasTokens: boolean
  balance: number
  needsTopup: boolean
}> {
  const balance = await tokenLedger.getUserBalance(userId)

  return {
    hasTokens: balance.total_balance > 0,
    balance: balance.total_balance,
    needsTopup: balance.total_balance < 5, // Warn when less than 5 messages
  }
}
