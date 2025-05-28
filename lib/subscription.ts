import { databaseService } from "./database-service"
import { pipelineLogger } from "./pipeline-logger"

export interface SubscriptionStatus {
  isActive: boolean
  plan: string | null
  expiresAt: Date | null
  tokensRemaining: number
  features: string[]
}

export async function checkSubscription(userId: string): Promise<SubscriptionStatus> {
  try {
    // Get user's active subscription
    const subscription = await databaseService.query(
      `SELECT * FROM subscriptions 
       WHERE user_id = $1 AND status = 'active' 
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    )

    // Get user's token balance
    const tokenResult = await databaseService.query(`SELECT token_balance FROM users WHERE id = $1`, [userId])

    const tokensRemaining = tokenResult.rows[0]?.token_balance || 0

    if (subscription.rows.length === 0) {
      // No active subscription - free tier
      return {
        isActive: false,
        plan: "free",
        expiresAt: null,
        tokensRemaining,
        features: ["basic_chat", "limited_tokens"],
      }
    }

    const sub = subscription.rows[0]
    const planFeatures = getPlanFeatures(sub.plan_id)

    return {
      isActive: true,
      plan: sub.plan_id,
      expiresAt: new Date(sub.current_period_end),
      tokensRemaining,
      features: planFeatures,
    }
  } catch (error) {
    await pipelineLogger.logError(
      `sub_check_${Date.now()}`,
      "SUBSCRIPTION",
      `Failed to check subscription for user ${userId}: ${error.message}`,
      false,
      { userId, error: error.stack },
    )

    // Return free tier on error
    return {
      isActive: false,
      plan: "free",
      expiresAt: null,
      tokensRemaining: 0,
      features: ["basic_chat"],
    }
  }
}

function getPlanFeatures(planId: string): string[] {
  const planFeatures = {
    basic: ["basic_chat", "standard_tokens", "email_support"],
    builder: ["advanced_chat", "premium_tokens", "priority_support", "custom_agents"],
    architect: ["unlimited_chat", "unlimited_tokens", "24_7_support", "custom_agents", "api_access", "white_label"],
  }

  return planFeatures[planId] || ["basic_chat"]
}
