import { NextResponse } from "next/server"

// Mock data - replace with actual database queries
const mockUsers = [
  {
    id: "1",
    name: "Neo Anderson",
    email: "neo@matrix.dev",
    role: "admin",
    status: "active",
    lastLogin: "2025-01-28 10:30:00",
    createdAt: "2025-01-15",
  },
  {
    id: "2",
    name: "Trinity",
    email: "trinity@zion.net",
    role: "user",
    status: "active",
    lastLogin: "2025-01-28 09:15:00",
    createdAt: "2025-01-20",
  },
  {
    id: "3",
    name: "Morpheus",
    email: "morpheus@nebuchadnezzar.ship",
    role: "moderator",
    status: "inactive",
    lastLogin: "2025-01-25 15:45:00",
    createdAt: "2025-01-10",
  },
  {
    id: "4",
    name: "Agent Smith",
    email: "smith@matrix.sys",
    role: "user",
    status: "suspended",
    lastLogin: "2025-01-20 08:22:00",
    createdAt: "2025-01-05",
  },
]

export async function GET() {
  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    return NextResponse.json({
      success: true,
      users: mockUsers,
      total: mockUsers.length,
    })
  } catch (error) {
    console.error("Failed to fetch users:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 })
  }
}
