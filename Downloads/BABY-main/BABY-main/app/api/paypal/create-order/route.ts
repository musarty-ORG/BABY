import { type NextRequest, NextResponse } from 'next/server'
import { paypalService } from '@/lib/paypal-service'
import { withErrorHandler } from '@/lib/error-handler'

export const POST = withErrorHandler(async (req: NextRequest) => {
  try {
    const { messages, userEmail, userId } = await req.json()

    if (!messages || !userEmail || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: messages, userEmail, userId',
        },
        { status: 400 }
      )
    }

    // Calculate pricing based on message count
    const pricing = {
      1: '1.00',
      5: '4.50', // 10% discount
      10: '9.00', // 10% discount
      25: '20.00', // 20% discount
    }

    const amount = pricing[messages as keyof typeof pricing]
    if (!amount) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid message count: ${messages}. Available: 1, 5, 10, 25`,
        },
        { status: 400 }
      )
    }

    const description = `Code Homie Top-up: ${messages} message${messages > 1 ? 's' : ''}`

    console.log(
      `Creating PayPal order for user ${userId}: ${messages} messages ($${amount})`
    )

    // Create PayPal order
    const order = await paypalService.createOrder(
      amount,
      description,
      userEmail
    )

    // Find approval URL
    const approvalLink = order.links.find((link) => link.rel === 'approve')

    if (!approvalLink) {
      throw new Error('No approval URL found in PayPal response')
    }

    console.log(`Order created successfully: ${order.id}`)

    return NextResponse.json({
      success: true,
      order_id: order.id,
      approval_url: approvalLink.href,
      amount: amount,
      messages: messages,
      status: order.status,
    })
  } catch (error: any) {
    console.error('PayPal order creation error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create order' },
      { status: 500 }
    )
  }
})
