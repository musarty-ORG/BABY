import { databaseService } from "./database-service"
import { v4 as uuidv4 } from "uuid"

export interface TokenLedgerEntry {
  id: string
  user_id: string
  delta: number // positive = credit, negative = debit
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
  subscription_id?: string
}

export class TokenLedgerService {
  private readonly tokensPerMessage: number
  private readonly billingCurrency: string

  constructor() {
    this.tokensPerMessage = Number.parseInt(process.env.TOKENS_PER_MSG || "1000")
    this.billingCurrency = process.env.BILLING_CURRENCY || "USD"
  }

  async addEntry(entry: Omit<TokenLedgerEntry, "id" | "created_at">): Promise<TokenLedgerEntry> {
    return await databaseService.createTokenLedgerEntry({
      id: `token_${uuidv4()}`,
      ...entry,
    })
  }

  async getUserBalance(userId: string): Promise<UserTokenBalance> {
    const balance = await databaseService.getUserTokenBalance(userId)
    return balance
  }

  async billUser(userId: string, tokensUsed: number, reason: string): Promise<boolean> {
    const messages = Math.ceil(tokensUsed / this.tokensPerMessage)
    const balance = await this.getUserBalance(userId)

    console.log(
      `Billing user ${userId}: ${tokensUsed} tokens = ${messages} messages (${this.tokensPerMessage} tokens per message)`,
    )

    if (balance.total_balance < messages) {
      console.log(`Insufficient balance for user ${userId}: need ${messages}, have ${balance.total_balance}`)
      throw new Error("NEED_TOPUP")
    }

    // Deduct from topup balance first, then monthly balance
    let remainingToDeduct = messages

    if (balance.topup_balance > 0) {
      const topupDeduction = Math.min(remainingToDeduct, balance.topup_balance)
      await this.addEntry({
        user_id: userId,
        delta: -topupDeduction,
        reason: `${reason} (topup usage: ${tokensUsed} tokens)`,
        metadata: {
          tokens_used: tokensUsed,
          type: "topup",
          tokens_per_message: this.tokensPerMessage,
          currency: this.billingCurrency,
        },
      })
      remainingToDeduct -= topupDeduction
      console.log(`Deducted ${topupDeduction} from topup balance`)
    }

    if (remainingToDeduct > 0) {
      await this.addEntry({
        user_id: userId,
        delta: -remainingToDeduct,
        reason: `${reason} (monthly usage: ${tokensUsed} tokens)`,
        metadata: {
          tokens_used: tokensUsed,
          type: "monthly",
          tokens_per_message: this.tokensPerMessage,
          currency: this.billingCurrency,
        },
      })
      console.log(`Deducted ${remainingToDeduct} from monthly balance`)
    }

    return true
  }

  async creditUser(
    userId: string,
    messages: number,
    reason: string,
    type: "monthly" | "topup" = "topup",
  ): Promise<void> {
    console.log(`Crediting user ${userId}: ${messages} messages (${type})`)

    await this.addEntry({
      user_id: userId,
      delta: messages,
      reason: reason,
      metadata: {
        type,
        tokens_per_message: this.tokensPerMessage,
        currency: this.billingCurrency,
      },
    })
  }

  async resetMonthlyBucket(userId: string, planMessages: number): Promise<void> {
    console.log(`Resetting monthly bucket for user ${userId}: ${planMessages} messages`)

    // First, clear any remaining monthly balance
    const balance = await this.getUserBalance(userId)
    if (balance.monthly_balance > 0) {
      await this.addEntry({
        user_id: userId,
        delta: -balance.monthly_balance,
        reason: "Monthly bucket reset - clearing remaining",
        metadata: {
          type: "monthly_reset",
          tokens_per_message: this.tokensPerMessage,
          currency: this.billingCurrency,
        },
      })
    }

    // Then add the new monthly allocation
    await this.addEntry({
      user_id: userId,
      delta: planMessages,
      reason: "Monthly bucket reset - new allocation",
      metadata: {
        type: "monthly",
        tokens_per_message: this.tokensPerMessage,
        currency: this.billingCurrency,
      },
    })
  }

  async getUserLedgerHistory(userId: string, limit = 50): Promise<TokenLedgerEntry[]> {
    return await databaseService.getUserTokenLedgerHistory(userId, limit)
  }

  getTokensPerMessage(): number {
    return this.tokensPerMessage
  }

  getBillingCurrency(): string {
    return this.billingCurrency
  }
}

export const tokenLedger = new TokenLedgerService()
