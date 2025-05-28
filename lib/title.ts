import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function generateTitle(prompt: string): Promise<string> {
  try {
    // Extract the first part of the conversation or prompt
    const truncatedPrompt = prompt.length > 200 ? prompt.substring(0, 200) + "..." : prompt

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `Generate a concise, descriptive title (max 6 words) for this conversation or request: "${truncatedPrompt}"
      
      Rules:
      - Keep it under 6 words
      - Make it descriptive and specific
      - Don't use quotes
      - Focus on the main topic or action
      
      Title:`,
      maxTokens: 50,
      temperature: 0.3,
    })

    // Clean up the response and ensure it's not too long
    const title = text.trim().replace(/^["']|["']$/g, "")

    // Fallback titles based on content
    if (!title || title.length < 3) {
      if (prompt.toLowerCase().includes("code")) return "Code Assistant"
      if (prompt.toLowerCase().includes("search")) return "Search Query"
      if (prompt.toLowerCase().includes("analyze")) return "Data Analysis"
      if (prompt.toLowerCase().includes("deploy")) return "Deployment Help"
      return "AI Conversation"
    }

    return title.length > 50 ? title.substring(0, 47) + "..." : title
  } catch (error) {
    console.error("Title generation error:", error)

    // Fallback title generation based on keywords
    const lowerPrompt = prompt.toLowerCase()
    if (lowerPrompt.includes("code") || lowerPrompt.includes("programming")) return "Code Assistant"
    if (lowerPrompt.includes("search") || lowerPrompt.includes("find")) return "Search Query"
    if (lowerPrompt.includes("analyze") || lowerPrompt.includes("data")) return "Data Analysis"
    if (lowerPrompt.includes("deploy") || lowerPrompt.includes("build")) return "Deployment Help"
    if (lowerPrompt.includes("bug") || lowerPrompt.includes("error")) return "Bug Fix"
    if (lowerPrompt.includes("optimize") || lowerPrompt.includes("improve")) return "Optimization"

    return "AI Conversation"
  }
}

export async function generateProjectTitle(description: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `Generate a creative project name for: "${description}"
      
      Rules:
      - 2-4 words maximum
      - Professional but memorable
      - Avoid generic terms like "app" or "system"
      - Make it specific to the project's purpose
      
      Project Name:`,
      maxTokens: 30,
      temperature: 0.5,
    })

    const title = text.trim().replace(/^["']|["']$/g, "")
    return title || "New Project"
  } catch (error) {
    console.error("Project title generation error:", error)
    return "New Project"
  }
}
