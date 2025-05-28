import { NextResponse } from "next/server"

const mockActivities = [
  {
    id: "1",
    user: "Neo",
    action: "Matrix breach detected",
    timestamp: "2 minutes ago",
    details: "Unauthorized access attempt from 192.168.1.100",
    severity: "warning",
  },
  {
    id: "2",
    user: "SYSTEM",
    action: "AI agent deployment",
    timestamp: "15 minutes ago",
    details: "Code generator agent v2.1 deployed successfully",
    severity: "info",
  },
  {
    id: "3",
    user: "Trinity",
    action: "Pipeline execution",
    timestamp: "1 hour ago",
    details: "Multi-agent pipeline completed - 847 operations",
    severity: "info",
  },
  {
    id: "4",
    user: "Morpheus",
    action: "Security scan initiated",
    timestamp: "2 hours ago",
    details: "Deep system vulnerability assessment started",
    severity: "info",
  },
  {
    id: "5",
    user: "SYSTEM",
    action: "Anomaly detected",
    timestamp: "3 hours ago",
    details: "Unusual traffic pattern from external source",
    severity: "warning",
  },
  {
    id: "6",
    user: "Agent Smith",
    action: "Access denied",
    timestamp: "4 hours ago",
    details: "Multiple failed authentication attempts",
    severity: "error",
  },
]

export async function GET() {
  try {
    await new Promise((resolve) => setTimeout(resolve, 200))

    return NextResponse.json({
      success: true,
      activities: mockActivities,
    })
  } catch (error) {
    console.error("Failed to fetch activities:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch activities" }, { status: 500 })
  }
}
