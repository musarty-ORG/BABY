import { type NextRequest, NextResponse } from 'next/server'
import { paypalService } from '@/lib/paypal-service'
import { tokenLedger } from '@/lib/token-ledger'
import { withErrorHandler } from '@/lib/error-handler'
import { databaseService } from '@/lib/database-service' // Declared the databaseService variable

export const GET = withErrorHandler(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('token') // PayPal uses 'token' parameter for order ID

    if (!orderId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?error=missing_order_id`
      )
    }

    console.log(`Processing order success: ${orderId}`)

    // Capture the order
    const capturedOrder = await paypalService.captureOrder(orderId)

    if (capturedOrder.status !== 'COMPLETED') {
      console.error(
        `Order capture failed: ${orderId}, status: ${capturedOrder.status}`
      )
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?error=payment_failed`
      )
    }

    // Extract user email and calculate messages from order
    const userEmail = capturedOrder.payer.email_address
    const amount = Number.parseFloat(
      capturedOrder.purchase_units[0].amount.value
    )

    // Calculate messages based on amount
    const messageMapping = {
      1.0: 1,
      4.5: 5,
      9.0: 10,
      20.0: 25,
    }

    const messages = messageMapping[amount as keyof typeof messageMapping]
    if (!messages) {
      console.error(`Unknown amount for top-up: $${amount}`)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?error=invalid_amount`
      )
    }

    // Find user by email (you might want to pass user ID in the order metadata instead)
    const user = await databaseService.getUserByEmail(userEmail)
    if (!user) {
      console.error(`User not found for email: ${userEmail}`)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?error=user_not_found`
      )
    }

    // Credit the user's account
    await tokenLedger.creditUser(
      user.id,
      messages,
      `Top-up purchase: ${messages} messages ($${amount})`,
      'topup'
    )

    console.log(
      `Top-up processed successfully: ${messages} messages for user ${user.id}`
    )

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?success=topup_completed&messages=${messages}`
    )
  } catch (error: any) {
    console.error('Order success processing error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?error=processing_failed`
    )
  }
})
