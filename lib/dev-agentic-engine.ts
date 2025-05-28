import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"

export interface DevToolCall {
  id: string
  type: "package_search" | "code_execution" | "documentation_lookup" | "dependency_check"
  tool: "npm" | "pnpm" | "pip" | "cargo" | "go_mod" | "composer" | "documentation" | "code_test"
  input: any
  output: any
  duration: number
  timestamp: string
}

export interface DevAgenticResponse {
  enhancedCode: string
  toolCalls: DevToolCall[]
  recommendations: string[]
  dependencies: string[]
  setupInstructions: string[]
  totalDuration: number
}

export interface CodeGenerationRequest {
  prompt: string
  projectType: string
  existingCode?: string
  dependencies?: string[]
  framework?: string
}

export class DevAgenticEngine {
  async enhanceCodeGeneration(request: CodeGenerationRequest): Promise<DevAgenticResponse> {
    const startTime = Date.now()

    try {
      console.log(`🔧 Enhancing code generation for ${request.projectType}`)

      // Build development-focused prompt
      const devPrompt = this.buildDevPrompt(request)

      // Use compound-beta for development tasks
      const result = await generateText({
        model: groq("compound-beta"),
        prompt: devPrompt,
        system: `You are a specialized development AI agent focused on code generation and website building.

AVAILABLE DEVELOPMENT TOOLS:
1. Package Search - Find and verify npm/pip/cargo packages
2. Code Execution - Test generated code snippets
3. Documentation Lookup - Get latest framework documentation
4. Dependency Check - Verify compatibility and versions

DEVELOPMENT FOCUS:
- Generate production-ready code for ${request.projectType}
- Use latest framework versions and best practices
- Automatically resolve dependencies and package versions
- Test code snippets before including them
- Provide setup instructions and package.json/requirements.txt

TOOL USAGE FOR CODE GENERATION:
- Search for packages when adding new functionality
- Test code snippets to ensure they work
- Look up documentation for latest API changes
- Check dependency compatibility

Current date: ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
Framework: ${request.framework || "Auto-detect"}
Project Type: ${request.projectType}`,
      })

      const totalDuration = Date.now() - startTime
      const toolCalls = this.extractDevToolCalls(result)

      return {
        enhancedCode: (result as any).text,
        toolCalls,
        recommendations: this.extractRecommendations(result),
        dependencies: this.extractDependencies(result),
        setupInstructions: this.extractSetupInstructions(result),
        totalDuration,
      }
    } catch (error) {
      console.error("❌ Dev agentic enhancement failed:", error)
      throw new Error(`Development enhancement failed: ${error}`)
    }
  }

  async resolvePackageDependencies(
    projectType: string,
    requiredFeatures: string[],
  ): Promise<{
    packages: Array<{ name: string; version: string; purpose: string }>
    packageManager: "npm" | "pnpm" | "pip" | "cargo"
    installCommands: string[]
  }> {
    const prompt = `Resolve package dependencies for ${projectType} project requiring: ${requiredFeatures.join(", ")}

Find the latest stable versions and provide install commands.`

    const result = await generateText({
      model: groq("compound-beta-mini"),
      prompt,
      system: `You are a package dependency resolver. Use web search to find latest package versions and compatibility information.

Focus on:
- Latest stable versions
- Security considerations
- Compatibility between packages
- Best practices for package management

Return structured dependency information.`,
    })

    return this.parsePackageInfo(result, projectType)
  }

  async validateGeneratedCode(
    code: string,
    projectType: string,
  ): Promise<{
    isValid: boolean
    errors: string[]
    suggestions: string[]
    fixedCode?: string
  }> {
    const prompt = `Validate and test this ${projectType} code:

\`\`\`
${code}
\`\`\`

Check for syntax errors, best practices, and provide fixes if needed.`

    const result = await generateText({
      model: groq("compound-beta-mini"),
      prompt,
      system: `You are a code validator. Use code execution to test snippets and verify they work correctly.

Check for:
- Syntax errors
- Runtime errors
- Best practices
- Security issues
- Performance concerns

Provide fixes and improvements.`,
    })

    return this.parseValidationResult(result)
  }

  async getFrameworkDocumentation(
    framework: string,
    feature: string,
  ): Promise<{
    documentation: string
    examples: string[]
    latestVersion: string
    migrationNotes?: string
  }> {
    const prompt = `Get latest documentation for ${framework} ${feature} feature. Include examples and current best practices.`

    const result = await generateText({
      model: groq("compound-beta-mini"),
      prompt,
      system: `You are a documentation assistant. Use web search to find the latest official documentation and examples.

Focus on:
- Official documentation
- Current best practices
- Working code examples
- Latest version information`,
    })

    return this.parseDocumentation(result)
  }

  private buildDevPrompt(request: CodeGenerationRequest): string {
    let prompt = `Generate ${request.projectType} code for: ${request.prompt}`

    if (request.existingCode) {
      prompt += `\n\nExisting code to enhance:\n\`\`\`\n${request.existingCode}\n\`\`\``
    }

    if (request.dependencies?.length) {
      prompt += `\n\nExisting dependencies: ${request.dependencies.join(", ")}`
    }

    if (request.framework) {
      prompt += `\n\nFramework: ${request.framework}`
    }

    prompt += `\n\nDEVELOPMENT REQUIREMENTS:
- Use latest stable versions of packages
- Follow current best practices for ${request.projectType}
- Include proper error handling
- Add TypeScript types where applicable
- Ensure responsive design (for UI projects)
- Include setup instructions
- Test code snippets before including

TOOLS TO USE:
- Search for latest package versions
- Test code snippets for functionality
- Look up current documentation
- Verify dependency compatibility`

    return prompt
  }

  private extractDevToolCalls(result: any): DevToolCall[] {
    const executedTools = result.executed_tools || []

    return executedTools.map((tool: any, index: number) => ({
      id: `dev_tool_${index}_${Date.now()}`,
      type: this.mapDevToolType(tool.type || tool.name),
      tool: this.mapDevTool(tool.type || tool.name),
      input: tool.input || tool.arguments,
      output: tool.output || tool.result,
      duration: tool.duration || 0,
      timestamp: new Date().toISOString(),
    }))
  }

  private mapDevToolType(
    toolName: string,
  ): "package_search" | "code_execution" | "documentation_lookup" | "dependency_check" {
    const name = toolName.toLowerCase()
    if (name.includes("package") || name.includes("npm") || name.includes("pip")) return "package_search"
    if (name.includes("code") || name.includes("execute") || name.includes("test")) return "code_execution"
    if (name.includes("doc") || name.includes("documentation")) return "documentation_lookup"
    return "dependency_check"
  }

  private mapDevTool(
    toolName: string,
  ): "npm" | "pnpm" | "pip" | "cargo" | "go_mod" | "composer" | "documentation" | "code_test" {
    const name = toolName.toLowerCase()
    if (name.includes("npm")) return "npm"
    if (name.includes("pnpm")) return "pnpm"
    if (name.includes("pip")) return "pip"
    if (name.includes("cargo")) return "cargo"
    if (name.includes("go")) return "go_mod"
    if (name.includes("composer")) return "composer"
    if (name.includes("doc")) return "documentation"
    return "code_test"
  }

  private extractRecommendations(result: any): string[] {
    // Extract recommendations from the AI response
    const text = (result as any).text || ""
    const recommendations: string[] = []

    // Look for recommendation patterns
    const patterns = [/RECOMMENDATION:\s*(.+)/gi, /SUGGEST:\s*(.+)/gi, /CONSIDER:\s*(.+)/gi, /TIP:\s*(.+)/gi]

    patterns.forEach((pattern) => {
      const matches = text.match(pattern)
      if (matches) {
        matches.forEach((match) => {
          const rec = match.replace(/^(RECOMMENDATION|SUGGEST|CONSIDER|TIP):\s*/i, "").trim()
          if (rec) recommendations.push(rec)
        })
      }
    })

    return recommendations
  }

  private extractDependencies(result: any): string[] {
    const text = (result as any).text || ""
    const dependencies: string[] = []

    // Look for package names and dependencies
    const patterns = [
      /"([^"]+)":\s*"[\^~]?[\d.]+"/g, // package.json style
      /npm install\s+([^\n]+)/g, // npm install commands
      /pip install\s+([^\n]+)/g, // pip install commands
    ]

    patterns.forEach((pattern) => {
      const matches = text.match(pattern)
      if (matches) {
        matches.forEach((match) => {
          // Extract package names
          const packages = match.split(/\s+/).filter((pkg) => pkg && !pkg.includes("install"))
          dependencies.push(...packages)
        })
      }
    })

    return [...new Set(dependencies)] // Remove duplicates
  }

  private extractSetupInstructions(result: any): string[] {
    const text = (result as any).text || ""
    const instructions: string[] = []

    // Look for setup instruction patterns
    const patterns = [
      /SETUP:\s*(.+)/gi,
      /INSTALLATION:\s*(.+)/gi,
      /RUN:\s*(.+)/gi,
      /\d+\.\s*(.+)/g, // Numbered lists
    ]

    patterns.forEach((pattern) => {
      const matches = text.match(pattern)
      if (matches) {
        matches.forEach((match) => {
          const instruction = match.replace(/^(SETUP|INSTALLATION|RUN|\d+\.):\s*/i, "").trim()
          if (instruction) instructions.push(instruction)
        })
      }
    })

    return instructions
  }

  private parsePackageInfo(result: any, projectType: string) {
    // Parse package information from AI response
    return {
      packages: [],
      packageManager: this.getPackageManager(projectType),
      installCommands: [],
    }
  }

  private parseValidationResult(result: any) {
    return {
      isValid: true,
      errors: [],
      suggestions: [],
    }
  }

  private parseDocumentation(result: any) {
    return {
      documentation: "",
      examples: [],
      latestVersion: "",
    }
  }

  private getPackageManager(projectType: string): "npm" | "pnpm" | "pip" | "cargo" {
    if (projectType.includes("python")) return "pip"
    if (projectType.includes("rust")) return "cargo"
    return "npm" // Default for web projects
  }
}

export const devAgenticEngine = new DevAgenticEngine()
