"use client"

import { useState, useEffect } from "react"
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Eye,
  Lock,
  Bug,
  Target,
  Download,
  RefreshCw,
  Activity,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SecurityAuditResult, SecurityVulnerability } from "@/lib/security-engine"

interface SecurityDashboardProps {
  codeFiles: Record<string, string>
  projectType: string
  onSecurityFix?: (filePath: string, fixedCode: string) => void
}

export default function SecurityDashboard({ codeFiles, projectType, onSecurityFix }: SecurityDashboardProps) {
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [selectedVuln, setSelectedVuln] = useState<SecurityVulnerability | null>(null)
  const [securityReport, setSecurityReport] = useState<string>("")
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    if (Object.keys(codeFiles).length > 0) {
      performSecurityScan()
    }
  }, [codeFiles, projectType])

  const performSecurityScan = async () => {
    setIsScanning(true)
    try {
      const response = await fetch("/api/security/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeFiles,
          projectType,
          config: {
            enableAutoFix: true,
            owaspLevel: "standard",
            penTestDepth: "deep",
            excludePatterns: [],
            customRules: [],
          },
        }),
      })

      const result = await response.json()
      if (result.success) {
        setAuditResult(result.audit)
        setSecurityReport(result.report)
      }
    } catch (error) {
      console.error("Security scan failed:", error)
    } finally {
      setIsScanning(false)
    }
  }

  const applySecurityFix = async (vulnerability: SecurityVulnerability) => {
    if (!vulnerability.autoFixAvailable || !onSecurityFix) return

    try {
      const response = await fetch("/api/security/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vulnerability,
          originalCode: codeFiles[vulnerability.location.file],
        }),
      })

      const result = await response.json()
      if (result.success) {
        onSecurityFix(vulnerability.location.file, result.fixedCode)
        // Refresh audit after fix
        performSecurityScan()
      }
    } catch (error) {
      console.error("Security fix failed:", error)
    }
  }

  const downloadSecurityReport = () => {
    if (!securityReport) return

    const blob = new Blob([securityReport], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `security-report-${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-400 bg-red-900/20 border-red-500/30"
      case "high":
        return "text-orange-400 bg-orange-900/20 border-orange-500/30"
      case "medium":
        return "text-yellow-400 bg-yellow-900/20 border-yellow-500/30"
      case "low":
        return "text-blue-400 bg-blue-900/20 border-blue-500/30"
      default:
        return "text-gray-400 bg-gray-900/20 border-gray-500/30"
    }
  }

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "critical":
        return "text-red-400"
      case "high":
        return "text-orange-400"
      case "medium":
        return "text-yellow-400"
      case "low":
        return "text-green-400"
      default:
        return "text-gray-400"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400"
    if (score >= 60) return "text-yellow-400"
    if (score >= 40) return "text-orange-400"
    return "text-red-400"
  }

  if (isScanning) {
    return (
      <Card className="bg-gray-900/50 border border-red-500/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-red-400 animate-pulse" />
            <CardTitle className="text-red-400">Security Fortress</CardTitle>
          </div>
          <CardDescription>Performing comprehensive security audit...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-red-500/70">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Scanning for vulnerabilities, OWASP compliance, and security issues...</span>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-red-400/70">
              <Bug className="w-4 h-4" />
              <span>Static code analysis...</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-red-400/70">
              <Target className="w-4 h-4" />
              <span>Penetration testing simulation...</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-red-400/70">
              <Lock className="w-4 h-4" />
              <span>OWASP Top 10 compliance check...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!auditResult) {
    return (
      <Card className="bg-gray-900/50 border border-red-500/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-red-400" />
            <CardTitle className="text-red-400">Security Fortress</CardTitle>
          </div>
          <CardDescription>Generate code to perform security analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500/70">Upload or generate code to start comprehensive security scanning.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900/50 border border-red-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-red-400" />
            <div>
              <CardTitle className="text-red-400">Security Fortress</CardTitle>
              <CardDescription>Comprehensive security analysis and hardening</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={downloadSecurityReport}
              variant="outline"
              size="sm"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10"
              disabled={!securityReport}
            >
              <Download className="w-4 h-4 mr-2" />
              Report
            </Button>
            <Button
              onClick={performSecurityScan}
              variant="outline"
              size="sm"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-scan
            </Button>
          </div>
        </div>

        {/* Security Score Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-800/50 border border-red-500/20 rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm font-semibold">Security Score</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(auditResult.overallScore)}`}>
              {auditResult.overallScore}/100
            </div>
            <Progress value={auditResult.overallScore} className="mt-2 h-2" />
          </div>

          <div className="bg-gray-800/50 border border-red-500/20 rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm font-semibold">Risk Level</span>
            </div>
            <div className={`text-xl font-bold ${getRiskLevelColor(auditResult.riskLevel)}`}>
              {auditResult.riskLevel.toUpperCase()}
            </div>
          </div>

          <div className="bg-gray-800/50 border border-red-500/20 rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <Bug className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm font-semibold">Vulnerabilities</span>
            </div>
            <div className="text-xl font-bold text-red-300">{auditResult.vulnerabilities.length}</div>
            <div className="text-xs text-red-400/70">
              {auditResult.vulnerabilities.filter((v) => v.severity === "critical").length} critical
            </div>
          </div>

          <div className="bg-gray-800/50 border border-red-500/20 rounded p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm font-semibold">Auto-fixes</span>
            </div>
            <div className="text-xl font-bold text-green-300">{auditResult.autoFixesApplied}</div>
            <div className="text-xs text-red-400/70">applied automatically</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 bg-gray-800/50">
            <TabsTrigger value="overview" className="text-red-400">
              Overview
            </TabsTrigger>
            <TabsTrigger value="vulnerabilities" className="text-red-400">
              Vulnerabilities
            </TabsTrigger>
            <TabsTrigger value="owasp" className="text-red-400">
              OWASP
            </TabsTrigger>
            <TabsTrigger value="pentest" className="text-red-400">
              Pen Test
            </TabsTrigger>
            <TabsTrigger value="headers" className="text-red-400">
              Headers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Critical Issues */}
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Critical Issues ({auditResult.vulnerabilities.filter((v) => v.severity === "critical").length})
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {auditResult.vulnerabilities
                    .filter((v) => v.severity === "critical")
                    .slice(0, 3)
                    .map((vuln, index) => (
                      <div key={index} className="text-sm">
                        <div className="text-red-300 font-medium">{vuln.title}</div>
                        <div className="text-red-400/70">{vuln.location.file}</div>
                      </div>
                    ))}
                  {auditResult.vulnerabilities.filter((v) => v.severity === "critical").length > 3 && (
                    <div className="text-red-400/70 text-sm">
                      +{auditResult.vulnerabilities.filter((v) => v.severity === "critical").length - 3} more...
                    </div>
                  )}
                </div>
              </div>

              {/* OWASP Compliance */}
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <h3 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  OWASP Compliance
                </h3>
                <div className="space-y-2">
                  {auditResult.owaspCompliance.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {item.compliant ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className={item.compliant ? "text-green-300" : "text-red-300"}>
                        {item.category.split(":")[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Manual Review Required */}
            {auditResult.manualReviewRequired.length > 0 && (
              <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                <h3 className="text-orange-400 font-semibold mb-3 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Manual Review Required
                </h3>
                <div className="space-y-2">
                  {auditResult.manualReviewRequired.map((item, index) => (
                    <div key={index} className="text-orange-300 text-sm">
                      • {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="vulnerabilities" className="space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {auditResult.vulnerabilities.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-green-400 font-semibold">No vulnerabilities detected!</p>
                  <p className="text-green-500/70 text-sm">Your code follows security best practices.</p>
                </div>
              ) : (
                auditResult.vulnerabilities.map((vuln, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${getSeverityColor(
                      vuln.severity,
                    )} ${selectedVuln?.id === vuln.id ? "ring-2 ring-red-400" : ""}`}
                    onClick={() => setSelectedVuln(selectedVuln?.id === vuln.id ? null : vuln)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-semibold">{vuln.title}</span>
                          <Badge className={getSeverityColor(vuln.severity)}>{vuln.severity.toUpperCase()}</Badge>
                          {vuln.cveId && <Badge variant="outline">{vuln.cveId}</Badge>}
                        </div>
                        <p className="text-sm opacity-90 mb-2">{vuln.description}</p>
                        <div className="flex items-center gap-4 text-xs opacity-70">
                          <span>📁 {vuln.location.file}</span>
                          <span>🎯 {vuln.owaspCategory}</span>
                          <span>⚡ {vuln.exploitability} to exploit</span>
                        </div>
                      </div>
                      {vuln.autoFixAvailable && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            applySecurityFix(vuln)
                          }}
                          size="sm"
                          className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400"
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          Auto-fix
                        </Button>
                      )}
                    </div>

                    {selectedVuln?.id === vuln.id && (
                      <div className="mt-4 pt-4 border-t border-current/20 space-y-3">
                        <div>
                          <h5 className="font-semibold mb-1">Impact:</h5>
                          <p className="text-sm opacity-90">{vuln.impact}</p>
                        </div>
                        <div>
                          <h5 className="font-semibold mb-1">Recommendation:</h5>
                          <p className="text-sm opacity-90">{vuln.recommendation}</p>
                        </div>
                        {vuln.location.codeSnippet && (
                          <div>
                            <h5 className="font-semibold mb-1">Vulnerable Code:</h5>
                            <pre className="text-xs bg-gray-800/50 p-2 rounded overflow-x-auto">
                              {vuln.location.codeSnippet}
                            </pre>
                          </div>
                        )}
                        {vuln.references.length > 0 && (
                          <div>
                            <h5 className="font-semibold mb-1">References:</h5>
                            <div className="space-y-1">
                              {vuln.references.map((ref, i) => (
                                <a
                                  key={i}
                                  href={ref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:text-blue-300 block"
                                >
                                  {ref}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="owasp" className="space-y-4">
            <div className="space-y-3">
              {auditResult.owaspCompliance.map((item, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    item.compliant ? "border-green-500/30 bg-green-900/20" : "border-red-500/30 bg-red-900/20"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {item.compliant ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    <span className={`font-semibold ${item.compliant ? "text-green-400" : "text-red-400"}`}>
                      {item.category}
                    </span>
                    <Badge className={item.compliant ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                      {item.compliant ? "COMPLIANT" : "NON-COMPLIANT"}
                    </Badge>
                  </div>
                  {item.issues.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-semibold mb-2 text-red-400">Issues Found:</h5>
                      <div className="space-y-1">
                        {item.issues.map((issue, i) => (
                          <div key={i} className="text-sm text-red-300/90">
                            • {issue}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pentest" className="space-y-4">
            <div className="space-y-3">
              {auditResult.penetrationTestResults.map((test, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    test.passed ? "border-green-500/30 bg-green-900/20" : "border-red-500/30 bg-red-900/20"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {test.passed ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    <span className={`font-semibold ${test.passed ? "text-green-400" : "text-red-400"}`}>
                      {test.testName}
                    </span>
                    <Badge className={getSeverityColor(test.severity)}>{test.severity.toUpperCase()}</Badge>
                    <Badge variant="outline">{test.category}</Badge>
                  </div>
                  <p className="text-sm opacity-90 mb-2">{test.description}</p>
                  {test.evidence && (
                    <div className="mb-2">
                      <h5 className="text-sm font-semibold mb-1">Evidence:</h5>
                      <pre className="text-xs bg-gray-800/50 p-2 rounded">{test.evidence}</pre>
                    </div>
                  )}
                  <div>
                    <h5 className="text-sm font-semibold mb-1">Recommendation:</h5>
                    <p className="text-sm opacity-90">{test.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="headers" className="space-y-4">
            <div className="space-y-3">
              {auditResult.securityHeaders.map((header, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    header.present ? "border-green-500/30 bg-green-900/20" : "border-yellow-500/30 bg-yellow-900/20"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {header.present ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    )}
                    <span className={`font-semibold ${header.present ? "text-green-400" : "text-yellow-400"}`}>
                      {header.header}
                    </span>
                    <Badge
                      className={header.present ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}
                    >
                      {header.present ? "PRESENT" : "MISSING"}
                    </Badge>
                  </div>
                  {header.value && (
                    <div className="mb-2">
                      <h5 className="text-sm font-semibold mb-1">Current Value:</h5>
                      <pre className="text-xs bg-gray-800/50 p-2 rounded">{header.value}</pre>
                    </div>
                  )}
                  <div>
                    <h5 className="text-sm font-semibold mb-1">Recommendation:</h5>
                    <p className="text-sm opacity-90">{header.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
