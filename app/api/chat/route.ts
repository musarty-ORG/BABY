import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { checkSubscription } from "@/lib/subscription"
import { OpenAIStream, StreamingTextResponse } from "@/utils/openai"
import { generateTitle } from "@/lib/title"
import { incrementUsageCount, checkUsageCount } from "@/lib/usage-limit"
import { billUserForTokens } from "@/lib/billing-middleware"
import { checkUserTokenBalance } from "@/lib/user-token-balance"

// Removed edge runtime due to next-auth compatibility issues with Node.js crypto

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const isPro = await checkSubscription()

    if (!isPro) {
      const canUseAPI = await checkUsageCount()
      if (!canUseAPI) {
        return new NextResponse("Usage limit exceeded", { status: 403 })
      }
    }

    const { prompt } = await req.json()

    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 })
    }

    const title = await generateTitle(prompt)

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant. Answer the users questions.",
          },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
    })

    const stream = OpenAIStream(response)

    const result = await OpenAIStream(response, {
      onCompletion: async (completion: string, usage: any) => {
        if (!isPro) {
          await incrementUsageCount()
        }
      },
    })

    if (result.usage?.total_tokens) {
      try {
        await billUserForTokens(req, session.userId, result.usage.total_tokens, "chat_completion")
      } catch (error: any) {
        if (error.field === "token_balance") {
          return NextResponse.json(
            {
              error: "NEED_TOPUP",
              message: error.message,
              balance_info: await checkUserTokenBalance(session.userId),
            },
            { status: 402 },
          ) // Payment Required
        }
        throw error
      }
    }

    return new StreamingTextResponse(stream)
  } catch (error) {
    console.error("[CHAT_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
