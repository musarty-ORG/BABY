import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { Redis } from "@upstash/redis"

const redis = (() => {
  try {
    if (process.env.USE_LOCAL_REDIS === "true") {
      return new Redis({ url: process.env.LOCAL_REDIS_URL || "redis://localhost:6379" })
    } else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      // Use the recommended fromEnv() method
      return Redis.fromEnv()
    } else {
      console.warn("Upstash Redis environment variables not found")
      return null
    }
  } catch (error) {
    console.error("Upstash Redis initialization failed:", error)
    return null
  }
})()

export interface ProjectContext {
  id: string
  name: string
  type: "web" | "mobile" | "desktop" | "api" | "fullstack"
  framework: string
  goals: string[]
  targetAudience: string
  businessLogic: string[]
  currentPhase: "planning" | "development" | "testing" | "deployment" | "maintenance"
  techStack: string[]
  features: ProjectFeature[]
  codeStyle: CodingStyle
  userPreferences: UserPreferences
  createdAt: string
  lastUpdated: string
}

export interface ProjectFeature {
  name: string
  description: string
  status: "planned" | "in-progress" | "completed" | "blocked"
  priority: "low" | "medium" | "high" | "critical"
  estimatedHours: number
  dependencies: string[]
  suggestedBy: "user" | "ai" | "analysis"
}

export interface CodingStyle {
  indentation: "tabs" | "2-spaces" | "4-spaces"
  quotes: "single" | "double"
  semicolons: boolean
  trailingCommas: boolean
  componentNaming: "PascalCase" | "camelCase" | "kebab-case"
  fileNaming: "PascalCase" | "camelCase" | "kebab-case"
  cssFramework: "tailwind" | "styled-components" | "css-modules" | "vanilla"
  stateManagement: "useState" | "zustand" | "redux" | "context"
  testingFramework: "jest" | "vitest" | "cypress" | "playwright"
  patterns: string[]
}

export interface UserPreferences {
  preferredLanguages: string[]
  experienceLevel: "beginner" | "intermediate" | "advanced" | "expert"
  learningGoals: string[]
  workingHours: string
  timezone: string
  communicationStyle: "concise" | "detailed" | "visual" | "step-by-step"
  notificationPreferences: {
    suggestions: boolean
    reminders: boolean
    updates: boolean
    learning: boolean
  }
}

export interface ProactiveSuggestion {
  id: string
  type: "feature" | "optimization" | "security" | "ux" | "performance" | "learning"
  title: string
  description: string
  reasoning: string
  implementation: string
  priority: "low" | "medium" | "high" | "urgent"
  estimatedTime: string
  benefits: string[]
  risks: string[]
  relatedFeatures: string[]
  codeExample?: string
  resources: Array<{
    title: string
    url: string
    type: "documentation" | "tutorial" | "example" | "tool"
  }>
  createdAt: string
  status: "pending" | "accepted" | "rejected" | "implemented"
}

export interface BusinessLogicSuggestion {
  entity: string
  schema: Record<string, any>
  relationships: Array<{
    type: "one-to-one" | "one-to-many" | "many-to-many"
    target: string
    description: string
  }>
  apiEndpoints: Array<{
    method: string
    path: string
    description: string
    parameters: Record<string, any>
    response: Record<string, any>
  }>
  businessRules: string[]
  validations: string[]
}

export class ContextualAssistant {
  private readonly CONTEXT_TTL = 86400 * 7 // 7 days
  private readonly SUGGESTION_TTL = 86400 * 3 // 3 days

  // Project Context Management
  async createProjectContext(userId: string, projectData: Partial<ProjectContext>): Promise<ProjectContext> {
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const context: ProjectContext = {
      id: projectId,
      name: projectData.name || "Untitled Project",
      type: projectData.type || "web",
      framework: projectData.framework || "react",
      goals: projectData.goals || [],
      targetAudience: projectData.targetAudience || "",
      businessLogic: projectData.businessLogic || [],
      currentPhase: "planning",
      techStack: projectData.techStack || [],
      features: [],
      codeStyle: this.getDefaultCodingStyle(),
      userPreferences: await this.getUserPreferences(userId),
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }

    await this.saveProjectContext(userId, context)
    return context
  }

  async updateProjectContext(
    userId: string,
    projectId: string,
    updates: Partial<ProjectContext>,
  ): Promise<ProjectContext> {
    const context = await this.getProjectContext(userId, projectId)
    if (!context) {
      throw new Error("Project context not found")
    }

    const updatedContext = {
      ...context,
      ...updates,
      lastUpdated: new Date().toISOString(),
    }

    await this.saveProjectContext(userId, updatedContext)
    return updatedContext
  }

  async getProjectContext(userId: string, projectId: string): Promise<ProjectContext | null> {
    try {
      const key = `context:${userId}:${projectId}`
      const context = await redis.get(key)
      return context ? JSON.parse(context as string) : null
    } catch (error) {
      console.error("Failed to get project context:", error)
      return null
    }
  }

  private async saveProjectContext(userId: string, context: ProjectContext): Promise<void> {
    try {
      const key = `context:${userId}:${context.id}`
      await redis.setex(key, this.CONTEXT_TTL, JSON.stringify(context))
    } catch (error) {
      console.error("Failed to save project context:", error)
    }
  }

  // Coding Style Learning
  async learnCodingStyle(userId: string, projectId: string, codeFiles: Record<string, string>): Promise<CodingStyle> {
    const context = await this.getProjectContext(userId, projectId)
    if (!context) {
      throw new Error("Project context not found")
    }

    const analyzedStyle = await this.analyzeCodingStyle(codeFiles)
    const updatedStyle = this.mergeCodingStyles(context.codeStyle, analyzedStyle)

    await this.updateProjectContext(userId, projectId, {
      codeStyle: updatedStyle,
    })

    return updatedStyle
  }

  private async analyzeCodingStyle(codeFiles: Record<string, string>): Promise<Partial<CodingStyle>> {
    const analysisPrompt = `Analyze these code files and extract the coding style patterns:

${Object.entries(codeFiles)
  .slice(0, 5)
  .map(([file, code]) => `File: ${file}\n${code.substring(0, 500)}...`)
  .join("\n\n")}

Extract:
1. Indentation style (tabs, 2-spaces, 4-spaces)
2. Quote preference (single, double)
3. Semicolon usage
4. Trailing comma usage
5. Component naming convention
6. File naming convention
7. CSS framework used
8. State management approach
9. Common patterns used

Return as JSON object with these properties.`

    try {
      const result = await generateText({
        model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
        prompt: analysisPrompt,
        system: "You are a code style analyzer. Extract consistent patterns from code samples.",
      })

      return JSON.parse(result.text)
    } catch (error) {
      console.error("Coding style analysis failed:", error)
      return {}
    }
  }

  private mergeCodingStyles(existing: CodingStyle, analyzed: Partial<CodingStyle>): CodingStyle {
    return {
      ...existing,
      ...analyzed,
      patterns: [...new Set([...existing.patterns, ...(analyzed.patterns || [])])],
    }
  }

  // Proactive Suggestions
  async generateProactiveSuggestions(
    userId: string,
    projectId: string,
    currentCode?: Record<string, string>,
  ): Promise<ProactiveSuggestion[]> {
    const context = await this.getProjectContext(userId, projectId)
    if (!context) {
      return []
    }

    const suggestions: ProactiveSuggestion[] = []

    // Feature suggestions based on project type and goals
    const featureSuggestions = await this.generateFeatureSuggestions(context, currentCode)
    suggestions.push(...featureSuggestions)

    // Performance optimization suggestions
    if (currentCode) {
      const performanceSuggestions = await this.generatePerformanceSuggestions(context, currentCode)
      suggestions.push(...performanceSuggestions)
    }

    // Security suggestions
    const securitySuggestions = await this.generateSecuritySuggestions(context, currentCode)
    suggestions.push(...securitySuggestions)

    // UX improvement suggestions
    const uxSuggestions = await this.generateUXSuggestions(context)
    suggestions.push(...uxSuggestions)

    // Learning suggestions based on user preferences
    const learningSuggestions = await this.generateLearningSuggestions(context)
    suggestions.push(...learningSuggestions)

    // Cache suggestions
    await this.cacheSuggestions(userId, projectId, suggestions)

    return suggestions.sort((a, b) => this.priorityScore(b.priority) - this.priorityScore(a.priority))
  }

  private async generateFeatureSuggestions(
    context: ProjectContext,
    currentCode?: Record<string, string>,
  ): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = []

    // Analyze project goals and suggest missing features
    const featurePrompt = `Based on this project context, suggest relevant features:

Project: ${context.name}
Type: ${context.type}
Framework: ${context.framework}
Goals: ${context.goals.join(", ")}
Target Audience: ${context.targetAudience}
Current Phase: ${context.currentPhase}
Existing Features: ${context.features.map((f) => f.name).join(", ")}

Suggest 3-5 features that would benefit this project.
Consider user needs, business goals, and technical feasibility.`

    try {
      const result = await generateText({
        model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
        prompt: featurePrompt,
        system: "You are a product manager and UX expert. Suggest valuable features for software projects.",
      })

      // Parse suggestions from AI response
      const parsedSuggestions = this.parseFeatureSuggestions(result.text, context)
      suggestions.push(...parsedSuggestions)
    } catch (error) {
      console.error("Feature suggestion generation failed:", error)
    }

    return suggestions
  }

  private async generatePerformanceSuggestions(
    context: ProjectContext,
    currentCode: Record<string, string>,
  ): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = []

    // Analyze code for performance improvements
    const performancePrompt = `Analyze this code for performance optimization opportunities:

Framework: ${context.framework}
Code Files: ${Object.keys(currentCode).join(", ")}

${Object.entries(currentCode)
  .slice(0, 3)
  .map(([file, code]) => `${file}:\n${code.substring(0, 800)}...`)
  .join("\n\n")}

Suggest specific performance optimizations with code examples.`

    try {
      const result = await generateText({
        model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
        prompt: performancePrompt,
        system: "You are a performance optimization expert. Identify bottlenecks and suggest improvements.",
      })

      const parsedSuggestions = this.parsePerformanceSuggestions(result.text, context)
      suggestions.push(...parsedSuggestions)
    } catch (error) {
      console.error("Performance suggestion generation failed:", error)
    }

    return suggestions
  }

  private async generateSecuritySuggestions(
    context: ProjectContext,
    currentCode?: Record<string, string>,
  ): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = []

    // Security best practices based on project type
    const securityChecks = {
      web: ["HTTPS", "CSRF protection", "XSS prevention", "Input validation", "Authentication"],
      api: ["Rate limiting", "API key management", "Input sanitization", "CORS configuration"],
      mobile: ["Data encryption", "Secure storage", "Certificate pinning", "Biometric auth"],
      fullstack: ["Database security", "Session management", "Environment variables", "Logging"],
    }

    const relevantChecks = securityChecks[context.type] || securityChecks.web

    relevantChecks.forEach((check) => {
      suggestions.push({
        id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "security",
        title: `Implement ${check}`,
        description: `Add ${check} to improve application security`,
        reasoning: `${check} is essential for ${context.type} applications to prevent security vulnerabilities`,
        implementation: `Research and implement ${check} best practices for ${context.framework}`,
        priority: "high",
        estimatedTime: "2-4 hours",
        benefits: [`Enhanced security`, `User trust`, `Compliance`],
        risks: [`Security vulnerabilities without this protection`],
        relatedFeatures: [],
        resources: [],
        createdAt: new Date().toISOString(),
        status: "pending",
      })
    })

    return suggestions
  }

  private async generateUXSuggestions(context: ProjectContext): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = []

    // UX improvements based on project type and target audience
    const uxPrompt = `Suggest UX improvements for this project:

Project: ${context.name}
Type: ${context.type}
Target Audience: ${context.targetAudience}
Current Features: ${context.features.map((f) => f.name).join(", ")}

Focus on user experience, accessibility, and usability improvements.`

    try {
      const result = await generateText({
        model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
        prompt: uxPrompt,
        system: "You are a UX/UI expert. Suggest improvements that enhance user experience and accessibility.",
      })

      const parsedSuggestions = this.parseUXSuggestions(result.text, context)
      suggestions.push(...parsedSuggestions)
    } catch (error) {
      console.error("UX suggestion generation failed:", error)
    }

    return suggestions
  }

  private async generateLearningSuggestions(context: ProjectContext): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = []

    // Learning opportunities based on user preferences and project needs
    const learningGoals = context.userPreferences.learningGoals
    const experienceLevel = context.userPreferences.experienceLevel

    if (learningGoals.length > 0) {
      learningGoals.forEach((goal) => {
        suggestions.push({
          id: `learn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: "learning",
          title: `Learn: ${goal}`,
          description: `Enhance your skills in ${goal} to improve your project`,
          reasoning: `${goal} aligns with your learning goals and project needs`,
          implementation: `Study ${goal} concepts and apply them to your project`,
          priority: "low",
          estimatedTime: "1-2 hours",
          benefits: [`Skill improvement`, `Better code quality`, `Career growth`],
          risks: [`Time investment`],
          relatedFeatures: [],
          resources: [],
          createdAt: new Date().toISOString(),
          status: "pending",
        })
      })
    }

    return suggestions
  }

  // Business Logic Understanding
  async analyzeBusinessLogic(
    userId: string,
    projectId: string,
    requirements: string[],
  ): Promise<BusinessLogicSuggestion[]> {
    const context = await this.getProjectContext(userId, projectId)
    if (!context) {
      return []
    }

    const businessPrompt = `Analyze these business requirements and suggest database schema and API design:

Project: ${context.name}
Type: ${context.type}
Requirements: ${requirements.join(", ")}
Business Logic: ${context.businessLogic.join(", ")}

Suggest:
1. Database entities and schemas
2. Relationships between entities
3. API endpoints
4. Business rules and validations
5. Data flow patterns

Focus on scalable, maintainable architecture.`

    try {
      const result = await generateText({
        model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
        prompt: businessPrompt,
        system: "You are a senior software architect. Design scalable database schemas and API architectures.",
      })

      return this.parseBusinessLogicSuggestions(result.text)
    } catch (error) {
      console.error("Business logic analysis failed:", error)
      return []
    }
  }

  // Utility Methods
  private getDefaultCodingStyle(): CodingStyle {
    return {
      indentation: "2-spaces",
      quotes: "double",
      semicolons: true,
      trailingCommas: true,
      componentNaming: "PascalCase",
      fileNaming: "kebab-case",
      cssFramework: "tailwind",
      stateManagement: "useState",
      testingFramework: "jest",
      patterns: [],
    }
  }

  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const key = `preferences:${userId}`
      const prefs = await redis.get(key)
      return prefs
        ? JSON.parse(prefs as string)
        : {
            preferredLanguages: ["typescript", "javascript"],
            experienceLevel: "intermediate",
            learningGoals: [],
            workingHours: "9-17",
            timezone: "UTC",
            communicationStyle: "detailed",
            notificationPreferences: {
              suggestions: true,
              reminders: true,
              updates: true,
              learning: true,
            },
          }
    } catch (error) {
      console.error("Failed to get user preferences:", error)
      return {
        preferredLanguages: ["typescript"],
        experienceLevel: "intermediate",
        learningGoals: [],
        workingHours: "9-17",
        timezone: "UTC",
        communicationStyle: "detailed",
        notificationPreferences: {
          suggestions: true,
          reminders: true,
          updates: true,
          learning: true,
        },
      }
    }
  }

  private priorityScore(priority: string): number {
    const scores = { urgent: 4, high: 3, medium: 2, low: 1 }
    return scores[priority as keyof typeof scores] || 1
  }

  private parseFeatureSuggestions(text: string, context: ProjectContext): ProactiveSuggestion[] {
    // Parse AI response into structured suggestions
    // This would include more sophisticated parsing logic
    return []
  }

  private parsePerformanceSuggestions(text: string, context: ProjectContext): ProactiveSuggestion[] {
    return []
  }

  private parseUXSuggestions(text: string, context: ProjectContext): ProactiveSuggestion[] {
    return []
  }

  private parseBusinessLogicSuggestions(text: string): BusinessLogicSuggestion[] {
    return []
  }

  private async cacheSuggestions(userId: string, projectId: string, suggestions: ProactiveSuggestion[]): Promise<void> {
    try {
      const key = `suggestions:${userId}:${projectId}`
      await redis.setex(key, this.SUGGESTION_TTL, JSON.stringify(suggestions))
    } catch (error) {
      console.error("Failed to cache suggestions:", error)
    }
  }
}

export const contextualAssistant = new ContextualAssistant()
