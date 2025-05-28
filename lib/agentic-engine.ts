import { groq } from "@ai-sdk/groq"
import { generateText, streamText } from "ai"

export interface AgenticToolCall {
  id: string
  type: "web_search" | "code_execution"
  input: any
  output: any
  duration: number
  timestamp: string
}

export interface AgenticResponse {
  content: string
  toolCalls: AgenticToolCall[]
  model: "compound-beta" | "compound-beta-mini"
  totalDuration: number
  timestamp: string
}

export interface AgenticRequest {
  message: string
  model?: "compound-beta" | "compound-beta-mini"
  maxToolCalls?: number
  enableWebSearch?: boolean
  enableCodeExecution?: boolean
  context?: string
}

export class AgenticEngine {
  private readonly DEFAULT_MODEL = "compound-beta"
  private readonly MINI_MODEL = "compound-beta-mini"

  async processAgenticRequest(request: AgenticRequest): Promise<AgenticResponse> {
    const startTime = Date.now()
    const model = request.model || this.DEFAULT_MODEL

    try {
      console.log(`🤖 Starting agentic request with ${model}`)
      console.log(`📝 Query: ${request.message}`)

      // Build the enhanced prompt for agentic tooling
      const enhancedPrompt = this.buildAgenticPrompt(request)

      // Use Groq's compound-beta models with automatic tool selection
      const result = await generateText({
        model: groq(model),
        prompt: enhancedPrompt,
        system: `You are an advanced AI agent with access to real-time web search and Python code execution capabilities.

AVAILABLE TOOLS:
1. Web Search (Tavily) - Use for real-time information, current events, research, documentation lookup
2. Code Execution (E2B) - Use for calculations, data analysis, programming tasks, testing code

TOOL SELECTION GUIDELINES:
- Use web search for: current events, real-time data, research, documentation, news, weather, stock prices
- Use code execution for: calculations, data processing, algorithm testing, code validation, mathematical operations
- You can use multiple tools in sequence to solve complex problems
- Always explain your tool usage and reasoning

RESPONSE FORMAT:
- Provide clear, accurate answers based on tool results
- Explain what tools you used and why
- Show your work for calculations or code
- Cite sources for web search results
- Be transparent about limitations

Current date: ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
      })

      const totalDuration = Date.now() - startTime

      // Parse tool calls from the response (Groq handles this automatically)
      const toolCalls = this.extractToolCalls(result)

      const response: AgenticResponse = {
        content: (result as any).text,
        toolCalls,
        model,
        totalDuration,
        timestamp: new Date().toISOString(),
      }

      console.log(`✅ Agentic request completed in ${totalDuration}ms`)
      console.log(`🔧 Tools used: ${toolCalls.length}`)

      return response
    } catch (error) {
      console.error("❌ Agentic request failed:", error)
      throw new Error(`Agentic processing failed: ${error}`)
    }
  }

  async streamAgenticResponse(request: AgenticRequest) {
    const model = request.model || this.DEFAULT_MODEL
    const enhancedPrompt = this.buildAgenticPrompt(request)

    console.log(`🌊 Starting streaming agentic request with ${model}`)

    return streamText({
      model: groq(model),
      prompt: enhancedPrompt,
      system: `You are an advanced AI agent with access to real-time web search and Python code execution capabilities.

AVAILABLE TOOLS:
1. Web Search (Tavily) - Use for real-time information, current events, research
2. Code Execution (E2B) - Use for calculations, data analysis, programming tasks

Stream your response while using tools. Explain your tool usage as you work.

Current date: ${new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
    })
  }

  private buildAgenticPrompt(request: AgenticRequest): string {
    let prompt = request.message

    // Add context if provided
    if (request.context) {
      prompt = `Context: ${request.context}\n\nQuery: ${prompt}`
    }

    // Add tool preferences
    const toolPreferences = []
    if (request.enableWebSearch !== false) {
      toolPreferences.push("web search for real-time information")
    }
    if (request.enableCodeExecution !== false) {
      toolPreferences.push("code execution for calculations and analysis")
    }

    if (toolPreferences.length > 0) {
      prompt += `\n\nAvailable tools: ${toolPreferences.join(", ")}`
    }

    // Add max tool calls limit for compound-beta
    if (request.model === "compound-beta" && request.maxToolCalls) {
      prompt += `\n\nMaximum tool calls: ${request.maxToolCalls}`
    }

    return prompt
  }

  private extractToolCalls(result: any): AgenticToolCall[] {
    // Groq's compound-beta models automatically handle tool calls
    // The executed_tools property contains the tool call information
    const executedTools = result.executed_tools || []

    return executedTools.map((tool: any, index: number) => ({
      id: `tool_${index}_${Date.now()}`,
      type: this.mapToolType(tool.type || tool.name),
      input: tool.input || tool.arguments,
      output: tool.output || tool.result,
      duration: tool.duration || 0,
      timestamp: new Date().toISOString(),
    }))
  }

  private mapToolType(toolName: string): "web_search" | "code_execution" {
    if (toolName.toLowerCase().includes("search") || toolName.toLowerCase().includes("tavily")) {
      return "web_search"
    }
    if (
      toolName.toLowerCase().includes("code") ||
      toolName.toLowerCase().includes("python") ||
      toolName.toLowerCase().includes("e2b")
    ) {
      return "code_execution"
    }
    return "web_search" // Default fallback
  }

  // Utility methods for specific use cases
  async searchAndAnalyze(
    query: string,
    analysisType: "data" | "research" | "comparison" = "research",
  ): Promise<AgenticResponse> {
    const request: AgenticRequest = {
      message: `Search for information about "${query}" and provide a comprehensive ${analysisType} analysis.`,
      model: "compound-beta",
      enableWebSearch: true,
      enableCodeExecution: analysisType === "data",
    }

    return this.processAgenticRequest(request)
  }

  async codeAndTest(codeRequest: string, language: "python" = "python"): Promise<AgenticResponse> {
    const request: AgenticRequest = {
      message: `Write and test ${language} code for: ${codeRequest}. Execute the code to verify it works correctly.`,
      model: "compound-beta-mini",
      enableWebSearch: false,
      enableCodeExecution: true,
    }

    return this.processAgenticRequest(request)
  }

  async researchWithCalculations(topic: string): Promise<AgenticResponse> {
    const request: AgenticRequest = {
      message: `Research "${topic}" and perform any necessary calculations or data analysis to provide comprehensive insights.`,
      model: "compound-beta",
      enableWebSearch: true,
      enableCodeExecution: true,
      maxToolCalls: 5,
    }

    return this.processAgenticRequest(request)
  }

  async quickAnswer(question: string): Promise<AgenticResponse> {
    const request: AgenticRequest = {
      message: question,
      model: "compound-beta-mini", // Faster for simple queries
      enableWebSearch: true,
      enableCodeExecution: false,
    }

    return this.processAgenticRequest(request)
  }

  // Performance comparison between models
  async compareModels(query: string): Promise<{
    beta: AgenticResponse
    mini: AgenticResponse
    comparison: {
      latencyDifference: number
      toolUsageDifference: number
      recommendation: string
    }
  }> {
    const [betaResult, miniResult] = await Promise.all([
      this.processAgenticRequest({ message: query, model: "compound-beta" }),
      this.processAgenticRequest({ message: query, model: "compound-beta-mini" }),
    ])

    const latencyDifference = betaResult.totalDuration - miniResult.totalDuration
    const toolUsageDifference = betaResult.toolCalls.length - miniResult.toolCalls.length

    let recommendation = "compound-beta-mini"
    if (toolUsageDifference > 2 || betaResult.content.length > miniResult.content.length * 1.5) {
      recommendation = "compound-beta"
    }

    return {
      beta: betaResult,
      mini: miniResult,
      comparison: {
        latencyDifference,
        toolUsageDifference,
        recommendation,
      },
    }
  }
}

export const agenticEngine = new AgenticEngine()
