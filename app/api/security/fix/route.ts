import { type NextRequest, NextResponse } from "next/server"
import { securityEngine } from "@/lib/security-engine"
import type { SecurityVulnerability } from "@/lib/security-engine"

export async function POST(req: NextRequest) {
  try {
    const { vulnerability, originalCode } = await req.json()

    if (!vulnerability || !originalCode) {
      return NextResponse.json(
        { success: false, error: "Vulnerability and original code are required" },
        { status: 400 },
      )
    }

    const vuln = vulnerability as SecurityVulnerability

    if (!vuln.autoFixAvailable) {
      return NextResponse.json(
        { success: false, error: "Auto-fix not available for this vulnerability" },
        { status: 400 },
      )
    }

    console.log(`🔧 Applying auto-fix for vulnerability: ${vuln.title}`)

    // Apply the security fix
    const fixedCode = await securityEngine.generateAutoFix(vuln, originalCode)

    if (!fixedCode) {
      return NextResponse.json({ success: false, error: "Failed to generate fix" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      fixedCode,
      vulnerability: vuln,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Security fix failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Security fix failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
