import { NextResponse } from "next/server"

const mockMetrics = [
  {
    id: "1",
    name: "Total Users",
    value: 1247,
    unit: "",
    trend: "up",
    status: "healthy",
  },
  {
    id: "2",
    name: "Active Sessions",
    value: 89,
    unit: "",
    trend: "stable",
    status: "healthy",
  },
  {
    id: "3",
    name: "API Requests",
    value: 15420,
    unit: "/hour",
    trend: "up",
    status: "healthy",
  },
  {
    id: "4",
    name: "Error Rate",
    value: 0.3,
    unit: "%",
    trend: "down",
    status: "warning",
  },
]

export async function GET() {
  try {
    await new Promise((resolve) => setTimeout(resolve, 300))

    return NextResponse.json({
      success: true,
      metrics: mockMetrics,
    })
  } catch (error) {
    console.error("Failed to fetch metrics:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch metrics" }, { status: 500 })
  }
}
