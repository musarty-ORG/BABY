import openai from "../utils/openai"
import { pipelineLogger } from "./pipeline-logger"

export async function generateTitle(message: string, requestId?: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Generate a short, descriptive title (max 6 words) for this conversation based on the user's message. Return only the title, no quotes or extra text.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      max_tokens: 20,
      temperature: 0.7,
    })

    const title = response.choices[0]?.message?.content?.trim() || "New Conversation"

    if (requestId) {
      await pipelineLogger.logInfo(requestId, "TITLE_GENERATOR", `Generated title: ${title}`)
    }

    return title
  } catch (error) {
    if (requestId) {
      await pipelineLogger.logError(requestId, "TITLE_GENERATOR", `Failed to generate title: ${error.message}`, false, {
        originalMessage: message.substring(0, 100),
      })
    }

    // Fallback to a simple title based on message content
    const words = message.split(" ").slice(0, 4).join(" ")
    return words.length > 0 ? words : "New Conversation"
  }
}
