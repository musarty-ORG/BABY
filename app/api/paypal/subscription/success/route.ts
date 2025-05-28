import { type NextRequest, NextResponse } from "next/server"
import { paypalService } from "@/lib/paypal-service"
import { databaseService } from "@/lib/database-service"
import { tokenLedger } from "@/lib/token-ledger"
import { withErrorHandler } from "@/lib/error-handler"

export const GET = withErrorHandler(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const subscriptionId = searchParams.get("subscription_id")

    if (!subscriptionId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/pricing?error=missing_subscription_id`)
    }

    console.log(`Processing subscription success: ${subscriptionId}`)

    // Get subscription details from PayPal
    const paypalSubscription = await paypalService.getSubscription(subscriptionId)

    // Update subscription in database
    const dbSubscription = await databaseService.getSubscriptionByPayPalId(subscriptionId)
    if (!dbSubscription) {
      console.error(`Subscription not found in database: ${subscriptionId}`)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/pricing?error=subscription_not_found`)
    }

    // Update subscription status
    await databaseService.updateSubscription(subscriptionId, {
      status: paypalSubscription.status,
      metadata: {
        ...dbSubscription.metadata,
        activated_at: new Date().toISOString(),
        paypal_status: paypalSubscription.status,
      },
    })

    // Update user plan
    const planMapping = {
      [process.env.PAYPAL_PLAN_BASIC!]: "basic",
      [process.env.PAYPAL_PLAN_BUILDER!]: "builder",
      [process.env.PAYPAL_PLAN_ARCHITECT!]: "architect",
    }

    const planName = planMapping[paypalSubscription.plan_id]
    if (planName) {
      await databaseService.updateUser(dbSubscription.user_id, {
        metadata: {
          plan: planName,
          subscription_id: subscriptionId,
        },
      })

      // Credit initial monthly messages
      const messageAllocation = {
        basic: 3,
        builder: 10,
        architect: 25,
      }

      const messages = messageAllocation[planName as keyof typeof messageAllocation]
      if (messages) {
        await tokenLedger.creditUser(dbSubscription.user_id, messages, `Initial ${planName} plan allocation`, "monthly")
      }
    }

    console.log(`Subscription activated successfully: ${subscriptionId}`)

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/pricing?success=subscription_activated`)
  } catch (error: any) {
    console.error("Subscription success processing error:", error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/pricing?error=processing_failed`)
  }
})
