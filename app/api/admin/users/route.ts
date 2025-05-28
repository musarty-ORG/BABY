import { type NextRequest, NextResponse } from "next/server"
import { withErrorHandler } from "@/lib/error-handler"
import { requireAdmin } from "@/lib/auth-middleware"
import { authSystem } from "@/lib/auth-system"
import { analyticsEngine } from "@/lib/analytics-engine"

export const GET = withErrorHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const url = new URL(req.url)
  const search = url.searchParams.get("search")
  const page = Number.parseInt(url.searchParams.get("page") || "1")
  const limit = Number.parseInt(url.searchParams.get("limit") || "20")

  let users
  if (search) {
    users = await authSystem.searchUsers(search, limit)
  } else {
    const offset = (page - 1) * limit
    users = await authSystem.getAllUsers(limit, offset)
  }

  // Format users for the admin panel
  const formattedUsers = users.map((user) => ({
    id: user.id,
    name: user.name || "Unknown",
    email: user.email,
    role: user.role,
    status: user.status,
    lastLogin: user.lastLoginAt ? user.lastLoginAt.toLocaleDateString() : "Never",
    createdAt: user.createdAt.toLocaleDateString(),
    tokenBalance: user.tokenBalance,
  }))

  await analyticsEngine.trackEvent({
    type: "admin_action",
    metadata: {
      action: "view_users",
      endpoint: "/api/admin/users",
      method: "GET",
      status_code: 200,
    },
  })

  return Response.json({
    success: true,
    users: formattedUsers,
    total: formattedUsers.length,
    page,
    totalPages: Math.ceil(formattedUsers.length / limit),
  })
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const body = await req.json()

  // Validate input
  if (!body.name || !body.email || !body.role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Check if user already exists
  const existingUser = await authSystem.getOrCreateUser(body.email)
  if (existingUser) {
    return NextResponse.json({ error: "User already exists" }, { status: 409 })
  }

  await analyticsEngine.trackEvent({
    type: "api_call",
    endpoint: "/api/admin/users",
    method: "POST",
    status_code: 201,
  })

  return NextResponse.json({ success: true }, { status: 201 })
})
