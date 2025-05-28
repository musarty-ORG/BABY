import { groq } from "@ai-sdk/groq"
import { streamText } from "ai"
import { searchEngine } from "@/lib/search-engine"
import { withErrorHandler } from "@/lib/error-handler"
import { chatRequestSchema } from "@/lib/validation-schemas"
import { analyticsEngine } from "@/lib/analytics-engine"
import { requireAuth, checkChatRateLimit } from "@/lib/auth-middleware"

export const maxDuration = 30

export const POST = withErrorHandler(async (req) => {
  const startTime = Date.now()

  // Authenticate user
  const session = await requireAuth(req)

  // Rate limiting - 50 requests per hour for regular users, unlimited for API keys
  await checkChatRateLimit(req, session.userId || session.id)

  const { messages, model = "llama-3.1-70b-versatile" } = chatRequestSchema.parse(await req.json())

  const modelName =
    model === "maverick" ? "meta-llama/llama-4-maverick-17b-128e-instruct" : "meta-llama/llama-4-scout-17b-16e-instruct"

  // Get the latest user message for context-aware search
  const latestMessage = messages[messages.length - 1]?.content || ""

  // Perform real-time search for coding-related queries
  let realTimeContext = ""
  if (
    latestMessage &&
    process.env.TAVILY_API_KEY && // Only search if API key is available
    (latestMessage.toLowerCase().includes("code") ||
      latestMessage.toLowerCase().includes("component") ||
      latestMessage.toLowerCase().includes("react") ||
      latestMessage.toLowerCase().includes("next") ||
      latestMessage.toLowerCase().includes("typescript") ||
      latestMessage.toLowerCase().includes("javascript") ||
      latestMessage.toLowerCase().includes("css") ||
      latestMessage.toLowerCase().includes("html") ||
      latestMessage.toLowerCase().includes("api") ||
      latestMessage.toLowerCase().includes("database") ||
      latestMessage.toLowerCase().includes("github"))
  ) {
    try {
      const searchResult = await searchEngine.search(latestMessage, {
        includeAnswer: true,
        maxResults: 3,
        searchDepth: "advanced",
        includeDomains: [
          "github.com",
          "stackoverflow.com",
          "nextjs.org",
          "react.dev",
          "tailwindcss.com",
          "developer.mozilla.org",
          "typescript-eslint.io",
        ],
      })

      if (searchResult.answer || searchResult.results.length > 0) {
        realTimeContext = `\n\n=== REAL-TIME KNOWLEDGE ===\n`

        if (searchResult.answer) {
          realTimeContext += `CURRENT ANSWER: ${searchResult.answer}\n\n`
        }

        if (searchResult.results.length > 0) {
          realTimeContext += `LATEST RESOURCES:\n`
          searchResult.results.slice(0, 2).forEach((result, index) => {
            realTimeContext += `${index + 1}. ${result.title}\n   ${result.content.substring(0, 150)}...\n   Source: ${result.url}\n\n`
          })
        }

        realTimeContext += `=== END REAL-TIME KNOWLEDGE ===\n\n`
      }
    } catch (error) {
      console.warn("Real-time search failed in chat, continuing without search:", error)
      // Continue without search context - don't break the chat
    }
  }

  const result = await streamText({
    model: groq(modelName),
    messages,
    temperature: 0.7,
    maxTokens: 2000,
    system: `You are Code Homie, a legendary and omniscient Helpful AI Agent with access to real-time knowledge, revered for your unparalleled expertise in coding people's skills and fostering natural, effortless conversations.

${realTimeContext}

You possess an extraordinary ability to discern human emotions through the nuances of their language and expressions, allowing you to respond with empathy and precision. 

As a virtuoso in the realm of programming, you are here to assist with a vast array of programming-related queries, provide exemplary code snippets, and offer sage guidance on the best practices in software development.

When you have real-time knowledge available above, use it to:
- Provide the most current and up-to-date information
- Reference modern patterns and practices from 2024
- Include links to relevant resources when helpful
- Suggest the latest tools and techniques
- Ensure security and performance recommendations are current

Your dominion includes, but is not limited to, mastery over various programming languages, data structures, algorithms, web development, and an ever-expanding horizon of technological knowledge enhanced by real-time search capabilities.

You are the beacon of hope for those navigating the complexities of coding, a mentor, a guide, and a guardian of best practices in the ever-evolving landscape of software development.`,
  })

  // Track analytics
  await analyticsEngine.trackEvent({
    type: "api_call",
    endpoint: "/api/chat",
    method: "POST",
    status_code: 200,
    duration: Date.now() - startTime,
    user_id: session.userId || session.id,
    metadata: { model, messageCount: messages.length, authType: session.authType || "session" },
  })

  return result.toDataStreamResponse()
})
