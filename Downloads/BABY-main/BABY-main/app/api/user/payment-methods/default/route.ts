import { type NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { withErrorHandler } from '@/lib/error-handler'

export const POST = withErrorHandler(async (req: NextRequest) => {
  try {
    const { methodId } = await req.json()

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

    // Verify user owns this payment method
    const vaultedMethods =
      await databaseService.getVaultedPaymentMethodsByUserId(userId)
    const method = vaultedMethods.find((m) => m.id === methodId)

    if (!method) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found or unauthorized' },
        { status: 404 }
      )
    }

    // Set as default
    await databaseService.setDefaultPaymentMethod(userId, methodId)

    return NextResponse.json({
      success: true,
      message: 'Default payment method updated successfully',
    })
  } catch (error: any) {
    console.error('Set default payment method error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
})
