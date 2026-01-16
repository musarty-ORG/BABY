import { type NextRequest, NextResponse } from 'next/server'
import { paypalService } from '@/lib/paypal-service'
import { databaseService } from '@/lib/database-service'
import { withErrorHandler } from '@/lib/error-handler'
import { v4 as uuidv4 } from 'uuid'

export const POST = withErrorHandler(async (req: NextRequest) => {
  try {
    const { plan, userEmail, userId } = await req.json()

    if (!plan || !userEmail || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: plan, userEmail, userId',
        },
        { status: 400 }
      )
    }

    // Validate plan
    const validPlans = ['basic', 'builder', 'architect']
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid plan: ${plan}. Must be one of: ${validPlans.join(', ')}`,
        },
        { status: 400 }
      )
    }

    console.log(
      `Creating PayPal subscription for user ${userId}, plan: ${plan}`
    )

    // Create PayPal subscription
    const subscription = await paypalService.createSubscription(plan, userEmail)

    // Store subscription in database
    await databaseService.createSubscription({
      id: uuidv4(),
      user_id: userId,
      plan_id: plan,
      paypal_subscription_id: subscription.id,
      status: 'APPROVAL_PENDING',
      metadata: {
        created_via: 'web',
        user_email: userEmail,
      },
    })

    // Find approval URL
    const approvalLink = subscription.links.find(
      (link) => link.rel === 'approve'
    )

    if (!approvalLink) {
      throw new Error('No approval URL found in PayPal response')
    }

    console.log(`Subscription created successfully: ${subscription.id}`)

    return NextResponse.json({
      success: true,
      subscription_id: subscription.id,
      approval_url: approvalLink.href,
      status: subscription.status,
    })
  } catch (error: any) {
    console.error('PayPal subscription creation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create subscription',
      },
      { status: 500 }
    )
  }
})
