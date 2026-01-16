import { type NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { withErrorHandler } from '@/lib/error-handler'

export const GET = withErrorHandler(async (req: NextRequest) => {
  try {
    // Get user session
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const sessionToken = authHeader.replace('Bearer ', '')
    let userId: string

    try {
      const decoded = JSON.parse(Buffer.from(sessionToken, 'base64').toString())
      userId = decoded.userId
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid session token' },
        { status: 401 }
      )
    }

    // Get user info
    const user = await databaseService.getUserById(userId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get token balance
    const tokenBalance = await databaseService.getUserTokenBalance(userId)

    // Get recent token history
    const tokenHistory = await databaseService.getUserTokenLedgerHistory(
      userId,
      20
    )

    // Get vaulted payment methods
    const paymentMethods =
      await databaseService.getVaultedPaymentMethodsByUserId(userId)

    // Get subscription info if exists
    let subscription = null
    if (user.metadata?.subscription_id) {
      try {
        // You might want to get this from PayPal or your database
        subscription = {
          id: user.metadata.subscription_id,
          plan: user.metadata?.plan || 'none',
          status: 'active', // This should come from PayPal webhook updates
          next_billing_date: user.metadata?.next_billing_date,
        }
      } catch (error) {
        console.error('Failed to get subscription info:', error)
      }
    }

    // Get recent analytics for this user
    const recentActivity = await databaseService.getAnalyticsEventsByType(
      'api_call',
      10
    )
    const userActivity = recentActivity.filter(
      (event) => event.user_id === userId
    )

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          created_at: user.created_at,
          last_login: user.last_login,
        },
        tokens: {
          total_balance: tokenBalance.total_balance,
          monthly_balance: tokenBalance.monthly_balance,
          topup_balance: tokenBalance.topup_balance,
          plan: tokenBalance.plan,
        },
        token_history: tokenHistory.map((entry) => ({
          id: entry.id,
          delta: entry.delta,
          reason: entry.reason,
          created_at: entry.created_at,
          type: entry.metadata?.type || 'unknown',
        })),
        payment_methods: paymentMethods.map((method) => ({
          id: method.id,
          vault_id: method.paypal_vault_id,
          type: method.payment_type,
          last_digits: method.last_digits,
          brand: method.brand,
          card_type: method.card_type,
          expiry: method.expiry,
          paypal_email: method.paypal_email,
          is_default: method.is_default,
          created_at: method.created_at,
        })),
        subscription,
        recent_activity: userActivity.slice(0, 5).map((activity) => ({
          id: activity.id,
          type: activity.type,
          endpoint: activity.endpoint,
          method: activity.method,
          status_code: activity.status_code,
          duration: activity.duration,
          timestamp: activity.timestamp,
        })),
        usage_stats: {
          total_api_calls: userActivity.length,
          avg_response_time:
            userActivity.length > 0
              ? Math.round(
                  userActivity.reduce((sum, a) => sum + (a.duration || 0), 0) /
                    userActivity.length
                )
              : 0,
        },
      },
    })
  } catch (error: any) {
    console.error('Enhanced dashboard error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
})
