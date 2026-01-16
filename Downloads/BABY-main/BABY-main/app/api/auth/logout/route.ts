import type { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/error-handler'
import { authSystem } from '@/lib/auth-system'

export const POST = withErrorHandler(async (req: NextRequest) => {
  const sessionId = req.headers.get('authorization')?.replace('Bearer ', '')

  if (sessionId) {
    await authSystem.destroySession(sessionId)
  }

  return Response.json({
    success: true,
    message: 'Logged out successfully',
  })
})
