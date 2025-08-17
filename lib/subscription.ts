import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_NEON_DATABASE_URL!)

export async function checkSubscription(userId?: string): Promise<boolean> {
  try {
    if (!userId) {
      return false
    }

    const subscriptions = await sql`
      SELECT subscription_status, subscription_expires_at, subscription_plan
      FROM users 
      WHERE id = ${userId}
    `

    if (subscriptions.length === 0) {
      return false
    }

    const subscription = subscriptions[0]

    // Check if user has an active subscription
    if (subscription.subscription_status === "active") {
      // Check if subscription hasn't expired
      if (subscription.subscription_expires_at) {
        const expiresAt = new Date(subscription.subscription_expires_at)
        const now = new Date()
        return expiresAt > now
      }
      return true
    }

    return false
  } catch (error) {
    console.error("Subscription check error:", error)
    return false
  }
}

export async function getSubscriptionDetails(userId: string) {
  try {
    const subscriptions = await sql`
      SELECT subscription_status, subscription_expires_at, subscription_plan, subscription_id
      FROM users 
      WHERE id = ${userId}
    `

    if (subscriptions.length === 0) {
      return null
    }

    return subscriptions[0]
  } catch (error) {
    console.error("Get subscription details error:", error)
    return null
  }
}

export async function updateSubscriptionStatus(userId: string, status: string, plan?: string, expiresAt?: Date) {
  try {
    await sql`
      UPDATE users 
      SET 
        subscription_status = ${status},
        subscription_plan = ${plan || null},
        subscription_expires_at = ${expiresAt || null},
        updated_at = NOW()
      WHERE id = ${userId}
    `
    return true
  } catch (error) {
    console.error("Update subscription status error:", error)
    return false
  }
}
