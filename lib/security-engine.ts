import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"

export interface SecurityVulnerability {
  id: string
  type:
    | "xss"
    | "sql-injection"
    | "csrf"
    | "auth"
    | "crypto"
    | "config"
    | "dependency"
    | "input-validation"
    | "access-control"
    | "logging"
  severity: "critical" | "high" | "medium" | "low" | "info"
  title: string
  description: string
  location: {
    file: string
    line?: number
    column?: number
    codeSnippet?: string
  }
  owaspCategory: string
  cveId?: string
  recommendation: string
  autoFixAvailable: boolean
  fixCode?: string
  impact: string
  exploitability: "easy" | "medium" | "hard"
  references: string[]
}

export interface SecurityAuditResult {
  projectId: string
  timestamp: string
  overallScore: number // 0-100
  riskLevel: "critical" | "high" | "medium" | "low"
  vulnerabilities: SecurityVulnerability[]
  owaspCompliance: {
    category: string
    compliant: boolean
    issues: string[]
  }[]
  securityHeaders: {
    header: string
    present: boolean
    value?: string
    recommendation: string
  }[]
  penetrationTestResults: PenTestResult[]
  autoFixesApplied: number
  manualReviewRequired: string[]
}

export interface PenTestResult {
  testName: string
  category: "authentication" | "authorization" | "input-validation" | "session-management" | "crypto" | "business-logic"
  passed: boolean
  severity: "critical" | "high" | "medium" | "low"
  description: string
  evidence?: string
  recommendation: string
}

export interface SecurityConfiguration {
  enableAutoFix: boolean
  owaspLevel: "basic" | "standard" | "strict"
  penTestDepth: "surface" | "deep" | "comprehensive"
  excludePatterns: string[]
  customRules: SecurityRule[]
}

export interface SecurityRule {
  id: string
  name: string
  pattern: RegExp
  severity: "critical" | "high" | "medium" | "low"
  message: string
  fix?: string
}

export class SecurityEngine {
  private readonly OWASP_TOP_10_2025 = [
    {
      id: "A01",
      name: "Broken Access Control",
      patterns: [
        /(?:admin|root|superuser)\s*=\s*true/gi,
        /(?:role|permission)\s*=\s*["'](?:admin|root|superuser)["']/gi,
        /(?:if|when)\s*\(\s*user\.role\s*==\s*["']admin["']/gi,
      ],
    },
    {
      id: "A02",
      name: "Cryptographic Failures",
      patterns: [
        /md5|sha1(?!\d)/gi,
        /password\s*=\s*["'][^"']*["']/gi,
        /(?:secret|key|token)\s*=\s*["'][^"']*["']/gi,
        /crypto\.createHash$$['"]md5['"]|['"]sha1['"]$$/gi,
      ],
    },
    {
      id: "A03",
      name: "Injection",
      patterns: [
        /\$\{[^}]*\}/g, // Template injection
        /eval\s*\(/gi,
        /innerHTML\s*=\s*[^;]*\+/gi,
        /document\.write\s*\(/gi,
        /dangerouslySetInnerHTML/gi,
      ],
    },
    {
      id: "A04",
      name: "Insecure Design",
      patterns: [
        /http:\/\/(?!localhost|127\.0\.0\.1)/gi,
        /cors\s*:\s*\{\s*origin\s*:\s*["']\*["']/gi,
        /allowCredentials\s*:\s*true/gi,
      ],
    },
    {
      id: "A05",
      name: "Security Misconfiguration",
      patterns: [/debug\s*:\s*true/gi, /NODE_ENV\s*=\s*["']development["']/gi, /console\.log\s*\(/gi, /\.env\s*\./gi],
    },
    {
      id: "A06",
      name: "Vulnerable and Outdated Components",
      patterns: [
        /"react":\s*["'][^"']*\^?(?:1[0-6]|[0-9])\./gi,
        /"lodash":\s*["'][^"']*\^?[0-3]\./gi,
        /"express":\s*["'][^"']*\^?[0-3]\./gi,
      ],
    },
    {
      id: "A07",
      name: "Identification and Authentication Failures",
      patterns: [
        /password\s*:\s*["'][^"']{1,7}["']/gi,
        /session\s*:\s*\{\s*secret\s*:\s*["'][^"']{1,15}["']/gi,
        /jwt\.sign\([^,]*,\s*["'][^"']{1,15}["']/gi,
      ],
    },
    {
      id: "A08",
      name: "Software and Data Integrity Failures",
      patterns: [
        /npm\s+install\s+[^@\s]+(?!@)/gi,
        /script\s+src\s*=\s*["']https?:\/\/[^"']*["']/gi,
        /integrity\s*=\s*["'][^"']*["']/gi,
      ],
    },
    {
      id: "A09",
      name: "Security Logging and Monitoring Failures",
      patterns: [
        /try\s*\{[^}]*\}\s*catch\s*$$[^)]*$$\s*\{\s*\}/gi,
        /\.catch\s*$$\s*\(\s*$$\s*=>\s*\{\s*\}\s*\)/gi,
        /error\s*=>\s*console\.log/gi,
      ],
    },
    {
      id: "A10",
      name: "Server-Side Request Forgery (SSRF)",
      patterns: [
        /fetch\s*\(\s*[^)]*req\.(?:query|body|params)/gi,
        /axios\.get\s*\(\s*[^)]*req\./gi,
        /http\.request\s*\(\s*[^)]*req\./gi,
      ],
    },
  ]

  private readonly SECURITY_HEADERS = [
    {
      name: "Content-Security-Policy",
      value:
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
      critical: true,
    },
    {
      name: "X-Frame-Options",
      value: "DENY",
      critical: true,
    },
    {
      name: "X-Content-Type-Options",
      value: "nosniff",
      critical: true,
    },
    {
      name: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
      critical: false,
    },
    {
      name: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
      critical: false,
    },
    {
      name: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
      critical: true,
    },
  ]

  async performSecurityAudit(
    codeFiles: Record<string, string>,
    projectType: string,
    config: SecurityConfiguration = {
      enableAutoFix: true,
      owaspLevel: "standard",
      penTestDepth: "deep",
      excludePatterns: [],
      customRules: [],
    },
  ): Promise<SecurityAuditResult> {
    console.log("🔒 Starting comprehensive security audit...")

    const vulnerabilities: SecurityVulnerability[] = []
    let autoFixesApplied = 0

    // Step 1: OWASP Top 10 Compliance Check
    const owaspCompliance = await this.checkOwaspCompliance(codeFiles)

    // Step 2: Static Code Analysis
    for (const [filePath, code] of Object.entries(codeFiles)) {
      const fileVulns = await this.analyzeCodeSecurity(filePath, code, config)
      vulnerabilities.push(...fileVulns)
    }

    // Step 3: Dependency Vulnerability Scan
    const depVulns = await this.scanDependencies(codeFiles)
    vulnerabilities.push(...depVulns)

    // Step 4: Security Headers Analysis
    const securityHeaders = await this.analyzeSecurityHeaders(codeFiles, projectType)

    // Step 5: Penetration Testing Simulation
    const penTestResults = await this.simulatePenetrationTest(codeFiles, projectType, config.penTestDepth)

    // Step 6: Auto-fix vulnerabilities
    if (config.enableAutoFix) {
      autoFixesApplied = await this.applyAutoFixes(vulnerabilities, codeFiles)
    }

    // Calculate overall security score
    const overallScore = this.calculateSecurityScore(vulnerabilities, owaspCompliance, securityHeaders)
    const riskLevel = this.determineRiskLevel(overallScore, vulnerabilities)

    return {
      projectId: `security-audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      overallScore,
      riskLevel,
      vulnerabilities: vulnerabilities.sort(
        (a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity),
      ),
      owaspCompliance,
      securityHeaders,
      penetrationTestResults: penTestResults,
      autoFixesApplied,
      manualReviewRequired: vulnerabilities
        .filter((v) => !v.autoFixAvailable && v.severity === "critical")
        .map((v) => v.title),
    }
  }

  private async checkOwaspCompliance(codeFiles: Record<string, string>) {
    const compliance = []

    for (const owaspItem of this.OWASP_TOP_10_2025) {
      const issues: string[] = []
      let compliant = true

      for (const [filePath, code] of Object.entries(codeFiles)) {
        for (const pattern of owaspItem.patterns) {
          const matches = code.match(pattern)
          if (matches) {
            compliant = false
            issues.push(`${filePath}: ${matches[0]}`)
          }
        }
      }

      compliance.push({
        category: `${owaspItem.id}: ${owaspItem.name}`,
        compliant,
        issues,
      })
    }

    return compliance
  }

  private async analyzeCodeSecurity(
    filePath: string,
    code: string,
    config: SecurityConfiguration,
  ): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = []

    // XSS Detection
    const xssPatterns = [
      { pattern: /dangerouslySetInnerHTML/g, severity: "high" as const },
      { pattern: /innerHTML\s*=\s*[^;]*\+/g, severity: "critical" as const },
      { pattern: /document\.write\s*\(/g, severity: "high" as const },
      { pattern: /eval\s*\(/g, severity: "critical" as const },
    ]

    for (const { pattern, severity } of xssPatterns) {
      const matches = [...code.matchAll(pattern)]
      for (const match of matches) {
        vulnerabilities.push({
          id: `xss-${Date.now()}-${Math.random()}`,
          type: "xss",
          severity,
          title: "Cross-Site Scripting (XSS) Vulnerability",
          description: `Potential XSS vulnerability detected: ${match[0]}`,
          location: {
            file: filePath,
            line: this.getLineNumber(code, match.index || 0),
            codeSnippet: match[0],
          },
          owaspCategory: "A03: Injection",
          recommendation: "Use safe DOM manipulation methods or sanitize user input",
          autoFixAvailable: true,
          fixCode: this.generateXSSFix(match[0]),
          impact: "Attackers can execute malicious scripts in user browsers",
          exploitability: "easy",
          references: [
            "https://owasp.org/www-community/attacks/xss/",
            "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html",
          ],
        })
      }
    }

    // SQL Injection Detection
    const sqlPatterns = [/\$\{[^}]*\}/g, /\+\s*["'][^"']*SELECT/gi, /query\s*\(\s*["'][^"']*\+/gi]

    for (const pattern of sqlPatterns) {
      const matches = [...code.matchAll(pattern)]
      for (const match of matches) {
        vulnerabilities.push({
          id: `sql-${Date.now()}-${Math.random()}`,
          type: "sql-injection",
          severity: "critical",
          title: "SQL Injection Vulnerability",
          description: `Potential SQL injection detected: ${match[0]}`,
          location: {
            file: filePath,
            line: this.getLineNumber(code, match.index || 0),
            codeSnippet: match[0],
          },
          owaspCategory: "A03: Injection",
          recommendation: "Use parameterized queries or prepared statements",
          autoFixAvailable: true,
          fixCode: this.generateSQLFix(match[0]),
          impact: "Attackers can access, modify, or delete database data",
          exploitability: "medium",
          references: [
            "https://owasp.org/www-community/attacks/SQL_Injection",
            "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html",
          ],
        })
      }
    }

    // Weak Cryptography Detection
    const cryptoPatterns = [
      { pattern: /md5|sha1(?!\d)/gi, severity: "high" as const },
      { pattern: /password\s*=\s*["'][^"']*["']/gi, severity: "critical" as const },
      { pattern: /secret\s*=\s*["'][^"']{1,15}["']/gi, severity: "high" as const },
    ]

    for (const { pattern, severity } of cryptoPatterns) {
      const matches = [...code.matchAll(pattern)]
      for (const match of matches) {
        vulnerabilities.push({
          id: `crypto-${Date.now()}-${Math.random()}`,
          type: "crypto",
          severity,
          title: "Weak Cryptographic Implementation",
          description: `Weak cryptography detected: ${match[0]}`,
          location: {
            file: filePath,
            line: this.getLineNumber(code, match.index || 0),
            codeSnippet: match[0],
          },
          owaspCategory: "A02: Cryptographic Failures",
          recommendation: "Use strong cryptographic algorithms (SHA-256, bcrypt, etc.)",
          autoFixAvailable: true,
          fixCode: this.generateCryptoFix(match[0]),
          impact: "Sensitive data may be compromised",
          exploitability: "medium",
          references: [
            "https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure",
            "https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html",
          ],
        })
      }
    }

    return vulnerabilities
  }

  private async scanDependencies(codeFiles: Record<string, string>): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = []
    const packageJson = codeFiles["package.json"]

    if (!packageJson) return vulnerabilities

    try {
      const pkg = JSON.parse(packageJson)
      const dependencies = { ...pkg.dependencies, ...pkg.devDependencies }

      // Known vulnerable packages (simplified database)
      const vulnerablePackages = {
        lodash: {
          versions: ["<4.17.21"],
          cve: "CVE-2021-23337",
          severity: "high" as const,
          description: "Prototype pollution vulnerability",
        },
        express: {
          versions: ["<4.18.0"],
          cve: "CVE-2022-24999",
          severity: "medium" as const,
          description: "Open redirect vulnerability",
        },
        react: {
          versions: ["<16.14.0"],
          cve: "CVE-2020-15168",
          severity: "medium" as const,
          description: "XSS vulnerability in development mode",
        },
      }

      for (const [pkgName, version] of Object.entries(dependencies)) {
        const vulnInfo = vulnerablePackages[pkgName as keyof typeof vulnerablePackages]
        if (vulnInfo && this.isVulnerableVersion(version as string, vulnInfo.versions)) {
          vulnerabilities.push({
            id: `dep-${pkgName}-${Date.now()}`,
            type: "dependency",
            severity: vulnInfo.severity,
            title: `Vulnerable Dependency: ${pkgName}`,
            description: vulnInfo.description,
            location: {
              file: "package.json",
              codeSnippet: `"${pkgName}": "${version}"`,
            },
            owaspCategory: "A06: Vulnerable and Outdated Components",
            cveId: vulnInfo.cve,
            recommendation: `Update ${pkgName} to the latest secure version`,
            autoFixAvailable: true,
            impact: "Security vulnerabilities in dependencies",
            exploitability: "medium",
            references: [
              `https://nvd.nist.gov/vuln/detail/${vulnInfo.cve}`,
              "https://owasp.org/www-project-dependency-check/",
            ],
          })
        }
      }
    } catch (error) {
      console.error("Failed to parse package.json:", error)
    }

    return vulnerabilities
  }

  private async analyzeSecurityHeaders(codeFiles: Record<string, string>, projectType: string) {
    const headers = []

    // Check if security headers are configured
    for (const header of this.SECURITY_HEADERS) {
      let present = false
      let value = ""

      // Check in various configuration files
      for (const [filePath, code] of Object.entries(codeFiles)) {
        if (filePath.includes("next.config") || filePath.includes("middleware") || filePath.includes("server")) {
          if (code.includes(header.name)) {
            present = true
            const match = code.match(new RegExp(`${header.name}['"\\s]*:?['"\\s]*([^'"\\n]+)`, "i"))
            if (match) value = match[1]
          }
        }
      }

      headers.push({
        header: header.name,
        present,
        value: value || undefined,
        recommendation: present ? "Header is configured" : `Add ${header.name}: ${header.value}`,
      })
    }

    return headers
  }

  private async simulatePenetrationTest(
    codeFiles: Record<string, string>,
    projectType: string,
    depth: "surface" | "deep" | "comprehensive",
  ): Promise<PenTestResult[]> {
    const results: PenTestResult[] = []

    // Authentication Tests
    results.push(...(await this.testAuthentication(codeFiles)))

    // Authorization Tests
    results.push(...(await this.testAuthorization(codeFiles)))

    // Input Validation Tests
    results.push(...(await this.testInputValidation(codeFiles)))

    if (depth === "deep" || depth === "comprehensive") {
      // Session Management Tests
      results.push(...(await this.testSessionManagement(codeFiles)))

      // Business Logic Tests
      results.push(...(await this.testBusinessLogic(codeFiles)))
    }

    if (depth === "comprehensive") {
      // Advanced Crypto Tests
      results.push(...(await this.testCryptography(codeFiles)))
    }

    return results
  }

  private async testAuthentication(codeFiles: Record<string, string>): Promise<PenTestResult[]> {
    const results: PenTestResult[] = []

    // Test for weak password policies
    const hasPasswordValidation = Object.values(codeFiles).some((code) =>
      /password.*(?:length|strength|complexity)/i.test(code),
    )

    results.push({
      testName: "Password Policy Enforcement",
      category: "authentication",
      passed: hasPasswordValidation,
      severity: hasPasswordValidation ? "low" : "high",
      description: hasPasswordValidation
        ? "Password validation found in code"
        : "No password strength validation detected",
      recommendation: hasPasswordValidation
        ? "Ensure password policy is comprehensive"
        : "Implement strong password requirements (min 12 chars, complexity)",
    })

    // Test for multi-factor authentication
    const hasMFA = Object.values(codeFiles).some((code) => /(?:mfa|2fa|totp|authenticator)/i.test(code))

    results.push({
      testName: "Multi-Factor Authentication",
      category: "authentication",
      passed: hasMFA,
      severity: hasMFA ? "low" : "medium",
      description: hasMFA ? "MFA implementation detected" : "No multi-factor authentication found",
      recommendation: hasMFA ? "Ensure MFA is properly implemented" : "Consider implementing MFA for enhanced security",
    })

    return results
  }

  private async testAuthorization(codeFiles: Record<string, string>): Promise<PenTestResult[]> {
    const results: PenTestResult[] = []

    // Test for role-based access control
    const hasRBAC = Object.values(codeFiles).some((code) => /(?:role|permission|authorize|canAccess)/i.test(code))

    results.push({
      testName: "Role-Based Access Control",
      category: "authorization",
      passed: hasRBAC,
      severity: hasRBAC ? "low" : "high",
      description: hasRBAC ? "Authorization controls detected" : "No role-based access control found",
      recommendation: hasRBAC
        ? "Verify authorization is properly enforced"
        : "Implement proper role-based access control",
    })

    return results
  }

  private async testInputValidation(codeFiles: Record<string, string>): Promise<PenTestResult[]> {
    const results: PenTestResult[] = []

    // Test for input sanitization
    const hasInputValidation = Object.values(codeFiles).some((code) => /(?:validate|sanitize|escape|trim)/i.test(code))

    results.push({
      testName: "Input Validation",
      category: "input-validation",
      passed: hasInputValidation,
      severity: hasInputValidation ? "low" : "critical",
      description: hasInputValidation ? "Input validation found" : "No input validation detected",
      recommendation: hasInputValidation
        ? "Ensure all inputs are properly validated"
        : "Implement comprehensive input validation and sanitization",
    })

    return results
  }

  private async testSessionManagement(codeFiles: Record<string, string>): Promise<PenTestResult[]> {
    const results: PenTestResult[] = []

    // Test for secure session configuration
    const hasSecureSession = Object.values(codeFiles).some((code) =>
      /session.*(?:secure|httpOnly|sameSite)/i.test(code),
    )

    results.push({
      testName: "Secure Session Configuration",
      category: "session-management",
      passed: hasSecureSession,
      severity: hasSecureSession ? "low" : "medium",
      description: hasSecureSession ? "Secure session configuration detected" : "Session security flags not found",
      recommendation: hasSecureSession
        ? "Verify session configuration is complete"
        : "Configure secure, httpOnly, and sameSite flags for sessions",
    })

    return results
  }

  private async testBusinessLogic(codeFiles: Record<string, string>): Promise<PenTestResult[]> {
    const results: PenTestResult[] = []

    // Test for rate limiting
    const hasRateLimit = Object.values(codeFiles).some((code) => /(?:rateLimit|throttle|limit)/i.test(code))

    results.push({
      testName: "Rate Limiting",
      category: "business-logic",
      passed: hasRateLimit,
      severity: hasRateLimit ? "low" : "medium",
      description: hasRateLimit ? "Rate limiting implementation found" : "No rate limiting detected",
      recommendation: hasRateLimit ? "Ensure rate limits are appropriate" : "Implement rate limiting to prevent abuse",
    })

    return results
  }

  private async testCryptography(codeFiles: Record<string, string>): Promise<PenTestResult[]> {
    const results: PenTestResult[] = []

    // Test for strong encryption
    const hasStrongCrypto = Object.values(codeFiles).some((code) =>
      /(?:aes-256|sha-256|bcrypt|scrypt|argon2)/i.test(code),
    )

    results.push({
      testName: "Strong Cryptography",
      category: "crypto",
      passed: hasStrongCrypto,
      severity: hasStrongCrypto ? "low" : "high",
      description: hasStrongCrypto ? "Strong cryptographic algorithms detected" : "Weak or no cryptography found",
      recommendation: hasStrongCrypto
        ? "Verify crypto implementation is correct"
        : "Use strong cryptographic algorithms (AES-256, SHA-256, bcrypt)",
    })

    return results
  }

  private async applyAutoFixes(
    vulnerabilities: SecurityVulnerability[],
    codeFiles: Record<string, string>,
  ): Promise<number> {
    let fixesApplied = 0

    for (const vuln of vulnerabilities) {
      if (vuln.autoFixAvailable && vuln.fixCode) {
        const file = codeFiles[vuln.location.file]
        if (file && vuln.location.codeSnippet) {
          codeFiles[vuln.location.file] = file.replace(vuln.location.codeSnippet, vuln.fixCode)
          fixesApplied++
        }
      }
    }

    return fixesApplied
  }

  private generateXSSFix(vulnerableCode: string): string {
    if (vulnerableCode.includes("dangerouslySetInnerHTML")) {
      return "// Use textContent or a sanitization library like DOMPurify"
    }
    if (vulnerableCode.includes("innerHTML")) {
      return "element.textContent = sanitizedContent"
    }
    if (vulnerableCode.includes("document.write")) {
      return "// Use DOM manipulation methods instead"
    }
    if (vulnerableCode.includes("eval")) {
      return "// Use JSON.parse() or other safe alternatives"
    }
    return "// Apply proper input sanitization"
  }

  private generateSQLFix(vulnerableCode: string): string {
    if (vulnerableCode.includes("${")) {
      return "// Use parameterized queries: query('SELECT * FROM users WHERE id = ?', [userId])"
    }
    return "// Use prepared statements or parameterized queries"
  }

  private generateCryptoFix(vulnerableCode: string): string {
    if (vulnerableCode.includes("md5") || vulnerableCode.includes("sha1")) {
      return "// Use SHA-256 or stronger: crypto.createHash('sha256')"
    }
    if (vulnerableCode.includes("password")) {
      return "// Use bcrypt for password hashing: await bcrypt.hash(password, 12)"
    }
    return "// Use strong cryptographic algorithms"
  }

  private calculateSecurityScore(
    vulnerabilities: SecurityVulnerability[],
    owaspCompliance: any[],
    securityHeaders: any[],
  ): number {
    let score = 100

    // Deduct points for vulnerabilities
    for (const vuln of vulnerabilities) {
      switch (vuln.severity) {
        case "critical":
          score -= 25
          break
        case "high":
          score -= 15
          break
        case "medium":
          score -= 8
          break
        case "low":
          score -= 3
          break
      }
    }

    // Deduct points for OWASP non-compliance
    const nonCompliantOwasp = owaspCompliance.filter((c) => !c.compliant).length
    score -= nonCompliantOwasp * 5

    // Deduct points for missing security headers
    const missingHeaders = securityHeaders.filter((h) => !h.present).length
    score -= missingHeaders * 3

    return Math.max(0, score)
  }

  private determineRiskLevel(
    score: number,
    vulnerabilities: SecurityVulnerability[],
  ): "critical" | "high" | "medium" | "low" {
    const criticalVulns = vulnerabilities.filter((v) => v.severity === "critical").length

    if (criticalVulns > 0 || score < 30) return "critical"
    if (score < 50) return "high"
    if (score < 75) return "medium"
    return "low"
  }

  private getSeverityWeight(severity: string): number {
    switch (severity) {
      case "critical":
        return 4
      case "high":
        return 3
      case "medium":
        return 2
      case "low":
        return 1
      default:
        return 0
    }
  }

  private getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split("\n").length
  }

  private isVulnerableVersion(version: string, vulnerableVersions: string[]): boolean {
    // Simplified version comparison - in production, use a proper semver library
    const cleanVersion = version.replace(/[\^~]/g, "")
    return vulnerableVersions.some((vulnVersion) => {
      if (vulnVersion.startsWith("<")) {
        const targetVersion = vulnVersion.substring(1)
        return this.compareVersions(cleanVersion, targetVersion) < 0
      }
      return false
    })
  }

  private compareVersions(a: string, b: string): number {
    const aParts = a.split(".").map(Number)
    const bParts = b.split(".").map(Number)

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0
      const bPart = bParts[i] || 0

      if (aPart < bPart) return -1
      if (aPart > bPart) return 1
    }

    return 0
  }

  async generateSecurityReport(auditResult: SecurityAuditResult): Promise<string> {
    const prompt = `Generate a comprehensive security report based on this audit:

SECURITY AUDIT RESULTS:
- Overall Score: ${auditResult.overallScore}/100
- Risk Level: ${auditResult.riskLevel.toUpperCase()}
- Vulnerabilities Found: ${auditResult.vulnerabilities.length}
- Auto-fixes Applied: ${auditResult.autoFixesApplied}

VULNERABILITIES:
${auditResult.vulnerabilities
  .map(
    (v) => `
- ${v.title} (${v.severity.toUpperCase()})
  Location: ${v.location.file}
  OWASP: ${v.owaspCategory}
  Impact: ${v.impact}
`,
  )
  .join("")}

OWASP COMPLIANCE:
${auditResult.owaspCompliance
  .map(
    (c) => `
- ${c.category}: ${c.compliant ? "COMPLIANT" : "NON-COMPLIANT"}
  ${c.issues.length > 0 ? `Issues: ${c.issues.join(", ")}` : ""}
`,
  )
  .join("")}

Generate a professional security report with:
1. Executive Summary
2. Risk Assessment
3. Detailed Findings
4. Remediation Recommendations
5. Implementation Timeline

Format as markdown with proper sections and severity indicators.`

    try {
      const result = await generateText({
        model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
        prompt,
        system:
          "You are a cybersecurity expert generating professional security audit reports. Focus on actionable recommendations and clear risk communication.",
      })

      return result.text
    } catch (error) {
      console.error("Failed to generate security report:", error)
      return this.generateFallbackReport(auditResult)
    }
  }

  private generateFallbackReport(auditResult: SecurityAuditResult): string {
    return `# Security Audit Report

## Executive Summary
Security Score: **${auditResult.overallScore}/100** (${auditResult.riskLevel.toUpperCase()} Risk)

## Key Findings
- ${auditResult.vulnerabilities.length} vulnerabilities identified
- ${auditResult.autoFixesApplied} issues automatically resolved
- ${auditResult.manualReviewRequired.length} critical issues require manual review

## Immediate Actions Required
${auditResult.manualReviewRequired.map((item) => `- ${item}`).join("\n")}

## Detailed Recommendations
Please review the full audit results for comprehensive remediation guidance.

Generated on: ${new Date(auditResult.timestamp).toLocaleString()}
`
  }
}

export const securityEngine = new SecurityEngine()
