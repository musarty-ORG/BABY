import { type NextRequest, NextResponse } from 'next/server'
import { paypalService } from '@/lib/paypal-service'
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

    // Get subscription from database
    const subscriptionId = user.metadata?.subscription_id
    if (!subscriptionId) {
      return NextResponse.json({
        success: true,
        subscription: null,
        message: 'No active subscription found',
      })
    }

    try {
      // Get subscription details from PayPal
      const paypalSubscription =
        await paypalService.getSubscription(subscriptionId)

      return NextResponse.json({
        success: true,
        subscription: {
          id: paypalSubscription.id,
          status: paypalSubscription.status,
          plan_id: paypalSubscription.plan_id,
          subscriber_email: paypalSubscription.subscriber.email_address,
          links: paypalSubscription.links,
        },
      })
    } catch (error) {
      console.error('Failed to get PayPal subscription:', error)
      return NextResponse.json({
        success: true,
        subscription: {
          id: subscriptionId,
          status: 'unknown',
          error: 'Failed to fetch subscription details from PayPal',
        },
      })
    }
  } catch (error: any) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
})

export const DELETE = withErrorHandler(async (req: NextRequest) => {
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

    const subscriptionId = user.metadata?.subscription_id
    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 404 }
      )
    }

    // Cancel subscription with PayPal
    await paypalService.cancelSubscription(
      subscriptionId,
      'User requested cancellation'
    )

    // Update user metadata
    const updatedMetadata = { ...user.metadata }
    delete updatedMetadata.subscription_id
    updatedMetadata.subscription_cancelled_at = new Date().toISOString()

    await databaseService.updateUser(userId, {
      metadata: updatedMetadata,
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
    })
  } catch (error: any) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
})
