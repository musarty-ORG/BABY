import { type NextRequest, NextResponse } from "next/server"
import { securityEngine } from "@/lib/security-engine"
import type { SecurityConfiguration } from "@/lib/security-engine"

export async function POST(req: NextRequest) {
  try {
    const { codeFiles, projectType, config } = await req.json()

    if (!codeFiles || typeof codeFiles !== "object") {
      return NextResponse.json({ success: false, error: "Invalid code files provided" }, { status: 400 })
    }

    const securityConfig: SecurityConfiguration = {
      enableAutoFix: true,
      owaspLevel: "standard",
      penTestDepth: "deep",
      excludePatterns: [],
      customRules: [],
      ...config,
    }

    console.log("🔒 Starting security audit for project type:", projectType)

    // Perform comprehensive security audit
    const auditResult = await securityEngine.performSecurityAudit(codeFiles, projectType || "generic", securityConfig)

    // Generate security report
    const securityReport = await securityEngine.generateSecurityReport(auditResult)

    console.log(
      `🔒 Security audit completed: ${auditResult.overallScore}/100 score, ${auditResult.vulnerabilities.length} vulnerabilities found`,
    )

    return NextResponse.json({
      success: true,
      audit: auditResult,
      report: securityReport,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Security audit failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Security audit failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
