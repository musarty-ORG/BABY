import { type NextRequest, NextResponse } from 'next/server'
import { paypalService } from '@/lib/paypal-service'
import { databaseService } from '@/lib/database-service'
import { tokenLedger } from '@/lib/token-ledger'
import { withErrorHandler } from '@/lib/error-handler'
import { v4 as uuidv4 } from 'uuid'

export const POST = withErrorHandler(async (req: NextRequest) => {
  try {
    const {
      amount,
      description,
      cardDetails,
      billingAddress,
      userEmail,
      userId,
      savePaymentMethod = false,
      messages,
    } = await req.json()

    // Validate required fields
    if (!amount || !cardDetails || !billingAddress || !userEmail || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required payment information' },
        { status: 400 }
      )
    }

    console.log(`Creating card payment for user ${userId}: $${amount}`)

    let customerId = null

    // If saving payment method, ensure customer exists
    if (savePaymentMethod) {
      let customer = await databaseService.getPayPalCustomerByUserId(userId)

      if (!customer) {
        // Create PayPal customer
        const paypalCustomer = await paypalService.createCustomer(
          userEmail,
          userId
        )

        // Save to database
        customer = await databaseService.createPayPalCustomer({
          id: uuidv4(),
          user_id: userId,
          paypal_customer_id: paypalCustomer.id,
          metadata: { created_via: 'card_payment' },
        })
      }

      customerId = customer.paypal_customer_id
    }

    // Create card payment
    const payment = await paypalService.createCardOrder(
      amount,
      description,
      cardDetails,
      billingAddress,
      userEmail,
      savePaymentMethod,
      customerId
    )

    // If this is a top-up purchase, credit tokens immediately
    if (messages && payment.status === 'COMPLETED') {
      await tokenLedger.creditUser(
        userId,
        messages,
        `Top-up purchase: ${messages} messages (Card Payment: ${payment.id})`,
        'topup'
      )

      console.log(`Credited ${messages} tokens to user ${userId}`)
    }

    // Save vaulted payment method if applicable
    if (
      savePaymentMethod &&
      payment.payment_source?.card?.attributes?.vault?.id
    ) {
      const vaultId = payment.payment_source.card.attributes.vault.id
      const card = payment.payment_source.card

      await databaseService.createVaultedPaymentMethod({
        id: uuidv4(),
        user_id: userId,
        paypal_vault_id: vaultId,
        payment_type: 'card',
        last_digits: card.last_digits,
        brand: card.brand,
        card_type: card.type,
        expiry: card.expiry,
        is_default: false, // User can set default later
        metadata: {
          created_via: 'card_payment',
          payment_id: payment.id,
        },
      })

      console.log(`Saved payment method to vault: ${vaultId}`)
    }

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      status: payment.status,
      amount: payment.amount.value,
      messages_credited: messages || 0,
      vault_id: payment.payment_source?.card?.attributes?.vault?.id || null,
    })
  } catch (error: any) {
    console.error('Card payment error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Payment failed' },
      { status: 500 }
    )
  }
})
