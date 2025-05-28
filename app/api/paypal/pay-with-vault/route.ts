import { type NextRequest, NextResponse } from "next/server"
import { paypalService } from "@/lib/paypal-service"
import { databaseService } from "@/lib/database-service"
import { tokenLedger } from "@/lib/token-ledger"
import { withErrorHandler } from "@/lib/error-handler"

export const POST = withErrorHandler(async (req: NextRequest) => {
  try {
    const { vaultId, amount, description, userId, messages } = await req.json()

    if (!vaultId || !amount || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: vaultId, amount, userId" },
        { status: 400 },
      )
    }

    console.log(`Processing vaulted payment for user ${userId}: $${amount}`)

    // Verify user owns this vault ID
    const vaultedMethods = await databaseService.getVaultedPaymentMethodsByUserId(userId)
    const method = vaultedMethods.find((m) => m.paypal_vault_id === vaultId)

    if (!method) {
      return NextResponse.json({ success: false, error: "Payment method not found or unauthorized" }, { status: 404 })
    }

    // Get PayPal customer ID
    const customer = await databaseService.getPayPalCustomerByUserId(userId)
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 })
    }

    // Process payment with vaulted method
    const payment = await paypalService.payWithVaultedMethod(vaultId, amount, description, customer.paypal_customer_id)

    // If this is a top-up purchase, credit tokens immediately
    if (messages && payment.status === "COMPLETED") {
      await tokenLedger.creditUser(
        userId,
        messages,
        `Top-up purchase: ${messages} messages (Vaulted Payment: ${payment.id})`,
        "topup",
      )

      console.log(`Credited ${messages} tokens to user ${userId}`)
    }

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      status: payment.status,
      amount: payment.amount.value,
      messages_credited: messages || 0,
      payment_method: {
        type: method.payment_type,
        last_digits: method.last_digits,
        brand: method.brand,
      },
    })
  } catch (error: any) {
    console.error("Vaulted payment error:", error)
    return NextResponse.json({ success: false, error: error.message || "Payment failed" }, { status: 500 })
  }
})
