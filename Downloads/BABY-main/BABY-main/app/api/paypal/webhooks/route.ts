import { type NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { tokenLedger } from '@/lib/token-ledger'
import { withErrorHandler } from '@/lib/error-handler'

const PLAN_CONFIGS = {
  [process.env.PAYPAL_PLAN_BASIC!]: { name: 'basic', messages: 3 },
  [process.env.PAYPAL_PLAN_BUILDER!]: { name: 'builder', messages: 10 },
  [process.env.PAYPAL_PLAN_ARCHITECT!]: { name: 'architect', messages: 25 },
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  try {
    const webhook = await req.json()
    const eventType = webhook.event_type

    console.log(`[PAYPAL_WEBHOOK] Received: ${eventType}`)

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.CREATED':
        await handleSubscriptionCreated(webhook)
        break

      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentSaleCompleted(webhook)
        break

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(webhook)
        break

      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(webhook)
        break

      case 'BILLING.SUBSCRIPTION.RENEWED':
        await handleSubscriptionRenewed(webhook)
        break

      default:
        console.log(`[PAYPAL_WEBHOOK] Unhandled event: ${eventType}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    })
  } catch (error: any) {
    console.error('[PAYPAL_WEBHOOK] Processing error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
})

// Action: add user, seed bucket
async function handleSubscriptionCreated(webhook: any) {
  const subscription = webhook.resource
  const subscriptionId = subscription.id
  const planId = subscription.plan_id

  console.log(
    `[WEBHOOK] Subscription created: ${subscriptionId}, Plan: ${planId}`
  )

  try {
    // Update subscription status in database
    await databaseService.updateSubscription(subscriptionId, {
      status: 'CREATED',
      metadata: {
        webhook_received: new Date().toISOString(),
        plan_id: planId,
        subscriber_email: subscription.subscriber?.email_address,
      },
    })

    console.log(`[WEBHOOK] Subscription ${subscriptionId} marked as CREATED`)
  } catch (error) {
    console.error(`[WEBHOOK] Error handling subscription created:`, error)
  }
}

// Action: top-up purchase - add messages
async function handlePaymentSaleCompleted(webhook: any) {
  const payment = webhook.resource
  const paymentId = payment.id

  console.log(`[WEBHOOK] Payment completed: ${paymentId}`)

  try {
    // Check if this is a top-up purchase by looking for order metadata
    const auditLogs = await databaseService.getAuditLogsByRequestId(paymentId)
    const topupLog = auditLogs.find(
      (log) => log.metadata?.type === 'topup_order'
    )

    if (topupLog) {
      const { messages, userId } = topupLog.metadata

      // Credit user with top-up messages
      await tokenLedger.creditUser(
        userId,
        messages,
        `Top-up purchase: ${messages} messages (Payment: ${paymentId})`,
        'topup'
      )

      console.log(
        `[WEBHOOK] Credited ${messages} top-up messages to user ${userId}`
      )
    } else {
      console.log(
        `[WEBHOOK] Payment ${paymentId} not identified as top-up purchase`
      )
    }
  } catch (error) {
    console.error(`[WEBHOOK] Error handling payment completed:`, error)
  }
}

// Action: freeze account
async function handleSubscriptionCancelled(webhook: any) {
  const subscription = webhook.resource
  const subscriptionId = subscription.id

  console.log(`[WEBHOOK] Subscription cancelled: ${subscriptionId}`)

  try {
    // Get subscription from database
    const dbSubscription =
      await databaseService.getSubscriptionByPayPalId(subscriptionId)
    if (!dbSubscription) {
      console.error(`[WEBHOOK] Subscription not found: ${subscriptionId}`)
      return
    }

    // Update subscription status
    await databaseService.updateSubscription(subscriptionId, {
      status: 'CANCELLED',
      metadata: {
        ...dbSubscription.metadata,
        cancelled_at: new Date().toISOString(),
        webhook_received: new Date().toISOString(),
      },
    })

    // Freeze account - update user plan to cancelled
    await databaseService.updateUser(dbSubscription.user_id, {
      metadata: {
        plan: 'cancelled',
        subscription_status: 'cancelled',
        frozen_at: new Date().toISOString(),
      },
    })

    console.log(`[WEBHOOK] Account frozen for user ${dbSubscription.user_id}`)
  } catch (error) {
    console.error(`[WEBHOOK] Error handling subscription cancelled:`, error)
  }
}

// Action: reset monthly bucket (ACTIVATED)
async function handleSubscriptionActivated(webhook: any) {
  const subscription = webhook.resource
  const subscriptionId = subscription.id
  const planId = subscription.plan_id

  console.log(
    `[WEBHOOK] Subscription activated: ${subscriptionId}, Plan: ${planId}`
  )

  try {
    // Get subscription from database
    const dbSubscription =
      await databaseService.getSubscriptionByPayPalId(subscriptionId)
    if (!dbSubscription) {
      console.error(`[WEBHOOK] Subscription not found: ${subscriptionId}`)
      return
    }

    // Update subscription status
    await databaseService.updateSubscription(subscriptionId, {
      status: 'ACTIVE',
      metadata: {
        ...dbSubscription.metadata,
        activated_at: new Date().toISOString(),
        webhook_received: new Date().toISOString(),
      },
    })

    // Reset monthly bucket and seed with plan messages
    const planConfig = PLAN_CONFIGS[planId]
    if (planConfig) {
      await tokenLedger.resetMonthlyBucket(
        dbSubscription.user_id,
        planConfig.messages
      )

      // Update user plan
      await databaseService.updateUser(dbSubscription.user_id, {
        metadata: {
          plan: planConfig.name,
          subscription_id: subscriptionId,
          subscription_status: 'active',
          activated_at: new Date().toISOString(),
        },
      })

      console.log(
        `[WEBHOOK] Reset monthly bucket: ${planConfig.messages} messages for user ${dbSubscription.user_id}`
      )
    }
  } catch (error) {
    console.error(`[WEBHOOK] Error handling subscription activated:`, error)
  }
}

// Action: reset monthly bucket (RENEWED)
async function handleSubscriptionRenewed(webhook: any) {
  const subscription = webhook.resource
  const subscriptionId = subscription.id
  const planId = subscription.plan_id

  console.log(
    `[WEBHOOK] Subscription renewed: ${subscriptionId}, Plan: ${planId}`
  )

  try {
    // Get subscription from database
    const dbSubscription =
      await databaseService.getSubscriptionByPayPalId(subscriptionId)
    if (!dbSubscription) {
      console.error(`[WEBHOOK] Subscription not found: ${subscriptionId}`)
      return
    }

    // Reset monthly bucket
    const planConfig = PLAN_CONFIGS[planId]
    if (planConfig) {
      await tokenLedger.resetMonthlyBucket(
        dbSubscription.user_id,
        planConfig.messages
      )

      // Update subscription metadata
      await databaseService.updateSubscription(subscriptionId, {
        metadata: {
          ...dbSubscription.metadata,
          last_renewed: new Date().toISOString(),
          webhook_received: new Date().toISOString(),
        },
      })

      console.log(
        `[WEBHOOK] Monthly bucket renewed: ${planConfig.messages} messages for user ${dbSubscription.user_id}`
      )
    }
  } catch (error) {
    console.error(`[WEBHOOK] Error handling subscription renewed:`, error)
  }
}
