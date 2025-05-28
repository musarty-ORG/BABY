import { type NextRequest, NextResponse } from "next/server"
import { databaseService } from "@/lib/database-service"
import { tokenLedger } from "@/lib/token-ledger"
import { withErrorHandler } from "@/lib/error-handler"

export const GET = withErrorHandler(async (req: NextRequest) => {
  try {
    // For now, we'll use a simple session token approach
    // In production, you'd want proper JWT or session management
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const sessionToken = authHeader.replace("Bearer ", "")

    // For demo purposes, we'll decode a simple token
    // In production, use proper JWT verification
    let userId: string
    try {
      const decoded = JSON.parse(Buffer.from(sessionToken, "base64").toString())
      userId = decoded.userId
    } catch {
      return NextResponse.json({ success: false, error: "Invalid session token" }, { status: 401 })
    }

    // Get user info
    const user = await databaseService.getUserById(userId)
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Get token balance
    const balance = await tokenLedger.getUserBalance(userId)

    // Get recent usage history
    const history = await tokenLedger.getUserLedgerHistory(userId, 10)

    // Get subscription info if exists
    let subscription = null
    if (balance.subscription_id) {
      subscription = await databaseService.getSubscriptionByPayPalId(balance.subscription_id)
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: balance.plan,
        },
        balance: {
          total: balance.total_balance,
          monthly: balance.monthly_balance,
          topup: balance.topup_balance,
        },
        subscription: subscription
          ? {
              id: subscription.paypal_subscription_id,
              status: subscription.status,
              plan: subscription.plan_id,
            }
          : null,
        recent_usage: history.slice(0, 5),
        config: {
          tokens_per_message: tokenLedger.getTokensPerMessage(),
          currency: tokenLedger.getBillingCurrency(),
        },
      },
    })
  } catch (error: any) {
    console.error("Dashboard API error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
})
