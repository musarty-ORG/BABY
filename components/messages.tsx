import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot, User } from "lucide-react"
import type { ChatCompletionRequestMessage } from "openai"

interface MessagesProps {
  messages: ChatCompletionRequestMessage[]
}

export function Messages({ messages }: MessagesProps) {
  if (!messages || messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <p>No messages yet. Start a conversation!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {messages.map((message, index) => {
        if (message.role === "system") return null // Don't display system messages

        const isUser = message.role === "user"

        return (
          <Card key={index} className={`${isUser ? "ml-8" : "mr-8"}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={isUser ? "bg-blue-500" : "bg-purple-500"}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{isUser ? "You" : "Assistant"}</span>
                    <span className="text-xs text-muted-foreground">{new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
