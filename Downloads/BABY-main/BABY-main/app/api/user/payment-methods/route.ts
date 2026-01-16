import { type NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { paypalService } from '@/lib/paypal-service'
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

    // Get vaulted payment methods from database
    const vaultedMethods =
      await databaseService.getVaultedPaymentMethodsByUserId(userId)

    // Format for frontend
    const formattedMethods = vaultedMethods.map((method) => ({
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
    }))

    return NextResponse.json({
      success: true,
      payment_methods: formattedMethods,
    })
  } catch (error: any) {
    console.error('Get payment methods error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
})

export const DELETE = withErrorHandler(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const methodId = searchParams.get('id')

    if (!methodId) {
      return NextResponse.json(
        { success: false, error: 'Payment method ID required' },
        { status: 400 }
      )
    }

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

    // Get the payment method to verify ownership and get vault ID
    const vaultedMethods =
      await databaseService.getVaultedPaymentMethodsByUserId(userId)
    const method = vaultedMethods.find((m) => m.id === methodId)

    if (!method) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      )
    }

    // Delete from PayPal vault
    await paypalService.deleteVaultedPaymentMethod(method.paypal_vault_id)

    // Delete from database
    await databaseService.deleteVaultedPaymentMethod(methodId)

    return NextResponse.json({
      success: true,
      message: 'Payment method deleted successfully',
    })
  } catch (error: any) {
    console.error('Delete payment method error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
})
