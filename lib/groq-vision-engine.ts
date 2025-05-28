import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"

export interface VisionAnalysis {
  description: string
  elements: Array<{
    type: string
    text?: string
    position: string
    properties: Record<string, any>
  }>
  layout: string
  colorScheme: string[]
  suggestions: string[]
}

export class GroqVisionEngine {
  // Analyze image using GROQ Vision API
  async analyzeImage(imageUrl: string): Promise<VisionAnalysis> {
    try {
      const result = await generateText({
        model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this UI/website image and provide detailed breakdown in JSON format. Include: description, elements (type, text, position, properties), layout, color scheme, and improvement suggestions.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        system: "You are an expert UI/UX analyzer. Return only valid JSON with the requested structure.",
      })

      try {
        return JSON.parse(result.text)
      } catch {
        // Fallback if JSON parsing fails
        return {
          description: result.text.substring(0, 200),
          elements: [],
          layout: "unknown",
          colorScheme: [],
          suggestions: [],
        }
      }
    } catch (error) {
      console.error("Vision analysis failed:", error)
      throw new Error("Failed to analyze image with GROQ Vision")
    }
  }

  // Analyze image from base64 data
  async analyzeImageFromBase64(base64Data: string): Promise<VisionAnalysis> {
    const dataUrl = `data:image/jpeg;base64,${base64Data}`
    return this.analyzeImage(dataUrl)
  }

  // Convert image to code using vision analysis
  async imageToCode(imageUrl: string, framework = "react"): Promise<string> {
    const analysis = await this.analyzeImage(imageUrl)

    const codePrompt = `Convert this UI analysis to ${framework} code:

Analysis: ${JSON.stringify(analysis)}

Generate clean, modern ${framework} code that recreates this design.
Use Tailwind CSS for styling.
Make it responsive and production-ready.
Include proper component structure and accessibility.`

    const result = await generateText({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      prompt: codePrompt,
      system: `You are a senior ${framework} developer. Convert UI designs to clean, production-ready code.`,
    })

    return result.text
  }

  // Multi-turn conversation with image context
  async chatWithImage(imageUrl: string, messages: Array<{ role: string; content: string }>): Promise<string> {
    const conversationMessages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Here's an image I want to discuss:",
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ]

    const result = await generateText({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      messages: conversationMessages as any,
      system: "You are a helpful AI assistant that can analyze and discuss images in detail.",
    })

    return result.text
  }

  // Extract specific information from image
  async extractImageInfo(imageUrl: string, query: string): Promise<any> {
    const result = await generateText({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${query} Return the answer in JSON format.`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      system: "You are an expert image analyzer. Extract the requested information and return it in JSON format.",
    })

    try {
      return JSON.parse(result.text)
    } catch {
      return { result: result.text }
    }
  }
}

export const groqVisionEngine = new GroqVisionEngine()
