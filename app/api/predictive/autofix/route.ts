import type { NextRequest } from "next/server"
import { predictiveEngine } from "@/lib/predictive-evolution"

export const maxDuration = 15

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, smells, filePath } = body

    if (!code || !smells || !Array.isArray(smells)) {
      return Response.json({ error: "Missing required fields: code, smells" }, { status: 400 })
    }

    const fixes: Record<string, string> = {}
    let fixedCode = code

    // Apply auto-fixes for each smell
    for (const smell of smells) {
      if (smell.autoFixAvailable) {
        const autoFix = await predictiveEngine.generateAutoFix(smell, fixedCode)
        if (autoFix) {
          fixes[`${smell.type}-${smell.severity}`] = autoFix
          fixedCode = autoFix // Apply fix to the code
        }
      }
    }

    return Response.json({
      success: true,
      originalCode: code,
      fixedCode,
      appliedFixes: fixes,
      fixCount: Object.keys(fixes).length,
      filePath,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Auto-fix error:", error)
    return Response.json(
      {
        error: "Auto-fix failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
