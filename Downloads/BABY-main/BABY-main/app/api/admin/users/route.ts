import { type NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/error-handler'
import { requireAdmin } from '@/lib/auth-middleware'
import { authSystem } from '@/lib/auth-system'
import { analyticsEngine } from '@/lib/analytics-engine'

export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const url = new URL(req.url)
  const search = url.searchParams.get('search')
  const page = Number.parseInt(url.searchParams.get('page') || '1')
  const limit = Number.parseInt(url.searchParams.get('limit') || '20')

  let users
  if (search) {
    users = await authSystem.searchUsers(search)
  } else {
    const offset = (page - 1) * limit
    users = await authSystem.getAllUsers()
  }

  await analyticsEngine.trackEvent({
    type: 'api_call',
    endpoint: '/api/admin/users',
    method: 'GET',
    status_code: 200,
  })

  return Response.json({
    success: true,
    users: users.slice((page - 1) * limit, page * limit),
    total: users.length,
    page,
    totalPages: Math.ceil(users.length / limit),
  })
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const body = await req.json()

  // Validate input
  if (!body.name || !body.email || !body.role) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  // Check if user already exists
  const existingUser = await authSystem.getOrCreateUser(body.email)
  if (existingUser) {
    return NextResponse.json({ error: 'User already exists' }, { status: 409 })
  }

  await analyticsEngine.trackEvent({
    type: 'api_call',
    endpoint: '/api/admin/users',
    method: 'POST',
    status_code: 201,
  })

  return NextResponse.json({ success: true }, { status: 201 })
})
