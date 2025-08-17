import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText, streamText, generateObject } from 'ai'
import { z } from 'zod'

export interface AnthropicConfig {
  model?: string
  maxTokens?: number
  temperature?: number
  topP?: number
}

export class AnthropicService {
  private anthropic: any
  private defaultConfig: AnthropicConfig = {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4000,
    temperature: 0.7,
    topP: 0.9,
  }

  constructor() {
    // Initialize Anthropic client lazily
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })
    }
  }

  private async validateConnection(): Promise<boolean> {
    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY not configured")
      }
      return true
    } catch (error) {
      console.error("Anthropic connection validation failed:", error)
      return false
    }
  }

  async generateText(
    prompt: string, 
    config: Partial<AnthropicConfig> = {}
  ): Promise<string> {
    try {
      const isConnected = await this.validateConnection()
      if (!isConnected || !this.anthropic) {
        throw new Error("Service connection not available")
      }

      const finalConfig = { ...this.defaultConfig, ...config }
      const model = this.anthropic(finalConfig.model)

      const { text } = await generateText({
        model,
        prompt,
        maxTokens: finalConfig.maxTokens,
        temperature: finalConfig.temperature,
      })

      return text
    } catch (error) {
      console.error("Anthropic text generation failed:", error)
      throw new Error("Failed to generate text response")
    }
  }

  async streamText(
    prompt: string, 
    config: Partial<AnthropicConfig> = {}
  ): Promise<ReadableStream> {
    try {
      const isConnected = await this.validateConnection()
      if (!isConnected || !this.anthropic) {
        throw new Error("Service connection not available")
      }

      const finalConfig = { ...this.defaultConfig, ...config }
      const model = this.anthropic(finalConfig.model)

      const { textStream } = await streamText({
        model,
        prompt,
        maxTokens: finalConfig.maxTokens,
        temperature: finalConfig.temperature,
      })

      return textStream
    } catch (error) {
      console.error("Anthropic text streaming failed:", error)
      throw new Error("Failed to stream text response")
    }
  }

  async generateStructuredObject<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    config: Partial<AnthropicConfig> = {}
  ): Promise<T> {
    try {
      const isConnected = await this.validateConnection()
      if (!isConnected || !this.anthropic) {
        throw new Error("Service connection not available")
      }

      const finalConfig = { ...this.defaultConfig, ...config }
      const model = this.anthropic(finalConfig.model)

      const { object } = await generateObject({
        model,
        prompt,
        schema,
        maxTokens: finalConfig.maxTokens,
        temperature: finalConfig.temperature,
      })

      return object
    } catch (error) {
      console.error("Anthropic structured generation failed:", error)
      throw new Error("Failed to generate structured response")
    }
  }

  async generateChatResponse(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    config: Partial<AnthropicConfig> = {}
  ): Promise<string> {
    try {
      const isConnected = await this.validateConnection()
      if (!isConnected || !this.anthropic) {
        throw new Error("Service connection not available")
      }

      const finalConfig = { ...this.defaultConfig, ...config }
      const model = this.anthropic(finalConfig.model)

      // Convert messages to a single prompt for now
      const prompt = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n')

      const { text } = await generateText({
        model,
        prompt,
        maxTokens: finalConfig.maxTokens,
        temperature: finalConfig.temperature,
      })

      return text
    } catch (error) {
      console.error("Anthropic chat response failed:", error)
      throw new Error("Failed to generate chat response")
    }
  }

  async streamChatResponse(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    config: Partial<AnthropicConfig> = {}
  ): Promise<ReadableStream> {
    try {
      const isConnected = await this.validateConnection()
      if (!isConnected || !this.anthropic) {
        throw new Error("Service connection not available")
      }

      const finalConfig = { ...this.defaultConfig, ...config }
      const model = this.anthropic(finalConfig.model)

      // Convert messages to a single prompt for now
      const prompt = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n')

      const { textStream } = await streamText({
        model,
        prompt,
        maxTokens: finalConfig.maxTokens,
        temperature: finalConfig.temperature,
      })

      return textStream
    } catch (error) {
      console.error("Anthropic chat streaming failed:", error)
      throw new Error("Failed to stream chat response")
    }
  }

  // Specialized methods for common use cases
  async summarizeText(text: string, maxLength: number = 200): Promise<string> {
    const prompt = `Summarize the following text in approximately ${maxLength} words:\n\n${text}`
    
    return this.generateText(prompt, {
      maxTokens: Math.max(maxLength * 2, 500),
      temperature: 0.3
    })
  }

  async analyzeText(text: string, aspects: string[]): Promise<any> {
    const aspectsStr = aspects.join(', ')
    const prompt = `Analyze the following text for these aspects: ${aspectsStr}. Provide a structured analysis:\n\n${text}`
    
    const analysisSchema = z.object({
      summary: z.string(),
      aspects: z.record(z.string()),
      sentiment: z.enum(['positive', 'negative', 'neutral']),
      confidence: z.number().min(0).max(1)
    })

    return this.generateStructuredObject(prompt, analysisSchema, {
      temperature: 0.2
    })
  }

  async improveText(text: string, improvements: string[]): Promise<string> {
    const improvementsStr = improvements.join(', ')
    const prompt = `Improve the following text by: ${improvementsStr}. Return only the improved version:\n\n${text}`
    
    return this.generateText(prompt, {
      temperature: 0.4
    })
  }

  async generateIdeas(topic: string, count: number = 5): Promise<string[]> {
    const prompt = `Generate ${count} creative and practical ideas about: ${topic}`
    
    const ideasSchema = z.object({
      ideas: z.array(z.string()).length(count)
    })

    const result = await this.generateStructuredObject(prompt, ideasSchema, {
      temperature: 0.8
    })

    return result.ideas
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const isConnected = await this.validateConnection()
      if (!isConnected) {
        return {
          success: false,
          message: "Anthropic API key not configured"
        }
      }

      const testResponse = await this.generateText("Respond with 'OK' to confirm connection", {
        maxTokens: 10,
        temperature: 0
      })

      return {
        success: true,
        message: "Anthropic connection successful",
        details: { 
          testResponse: testResponse.trim(),
          model: this.defaultConfig.model 
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Anthropic connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        details: { error: error instanceof Error ? error.stack : error }
      }
    }
  }

  // Get available models (static for now)
  getAvailableModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ]
  }

  // Update default configuration
  updateConfig(config: Partial<AnthropicConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config }
  }

  // Get current configuration
  getConfig(): AnthropicConfig {
    return { ...this.defaultConfig }
  }
}

export const anthropicService = new AnthropicService()