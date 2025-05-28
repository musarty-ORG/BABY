import type { NextRequest } from "next/server"
import { predictiveEngine } from "@/lib/predictive-evolution"

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { codeFiles, projectType, userId, filePath, action } = body

    if (!codeFiles || !projectType) {
      return Response.json({ error: "Missing required fields: codeFiles and projectType" }, { status: 400 })
    }

    const results = {
      codeSmells: [] as any[],
      refactoringOpportunities: [] as any[],
      dependencyAlerts: [] as any[],
      predictiveInsights: [] as any[],
      autoFixes: {} as Record<string, string>,
    }

    // Analyze each code file
    for (const [path, code] of Object.entries(codeFiles)) {
      if (typeof code === "string") {
        // Detect code smells
        const smells = await predictiveEngine.detectCodeSmells(code, path, projectType)
        results.codeSmells.push(...smells.map((smell) => ({ ...smell, file: path })))

        // Generate refactoring opportunities
        const opportunities = await predictiveEngine.generateRefactoringOpportunities(code, path, projectType)
        results.refactoringOpportunities.push(...opportunities.map((opp) => ({ ...opp, file: path })))

        // Generate auto-fixes for applicable smells
        for (const smell of smells) {
          if (smell.autoFixAvailable) {
            const autoFix = await predictiveEngine.generateAutoFix(smell, code)
            if (autoFix) {
              results.autoFixes[`${path}:${smell.type}`] = autoFix
            }
          }
        }
      }
    }

    // Check dependency health if package.json exists
    if (codeFiles["package.json"]) {
      try {
        const dependencyAlerts = await predictiveEngine.checkDependencyHealth(codeFiles["package.json"])
        results.dependencyAlerts = dependencyAlerts
      } catch (error) {
        console.warn("Dependency health check failed:", error)
        results.dependencyAlerts = []
      }
    }

    // Generate predictive insights
    if (userId) {
      const insights = await predictiveEngine.generatePredictiveInsights(userId, projectType, codeFiles)
      results.predictiveInsights = insights
    }

    // Track user behavior if provided
    if (userId && action) {
      await predictiveEngine.trackUserBehavior({
        userId,
        action,
        context: {
          projectType,
          codePattern: filePath || "unknown",
          timestamp: new Date().toISOString(),
          success: true,
          timeSpent: 0,
        },
      })
    }

    return Response.json({
      success: true,
      analysis: results,
      summary: {
        totalSmells: results.codeSmells.length,
        criticalIssues: results.codeSmells.filter((s) => s.severity === "critical").length,
        refactoringOpportunities: results.refactoringOpportunities.length,
        dependencyAlerts: results.dependencyAlerts.length,
        predictiveInsights: results.predictiveInsights.length,
        autoFixesAvailable: Object.keys(results.autoFixes).length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Predictive analysis error:", error)
    return Response.json(
      {
        error: "Analysis failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
