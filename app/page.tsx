"use client"

import { useChat } from "ai/react"
import { useState, useRef, useEffect } from "react"
import { Send, Terminal, Zap, Code, Shield, Brain, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function HackerAgent() {
  const [selectedModel, setSelectedModel] = useState<"scout" | "maverick">("scout")
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    body: { model: selectedModel },
  })
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isLoading) {
      setIsTyping(true)
    } else {
      setIsTyping(false)
    }
  }, [isLoading])

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      {/* Header */}
      <div className="border-b border-green-500/30 bg-black/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-6 h-6 text-green-400" />
              <span className="text-xl font-bold text-green-400">NEXUS</span>
            </div>

            {/* Model Toggle */}
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs text-green-500/70">MODEL:</span>
              <div className="flex items-center bg-gray-800/50 border border-green-500/30 rounded-lg p-1">
                <button
                  onClick={() => setSelectedModel("scout")}
                  className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                    selectedModel === "scout"
                      ? "bg-green-500/30 text-green-300 border border-green-500/50"
                      : "text-green-500/70 hover:text-green-400"
                  }`}
                >
                  S
                </button>
                <button
                  onClick={() => setSelectedModel("maverick")}
                  className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                    selectedModel === "maverick"
                      ? "bg-green-500/30 text-green-300 border border-green-500/50"
                      : "text-green-500/70 hover:text-green-400"
                  }`}
                >
                  M
                </button>
              </div>
            </div>

            {/* Multi-Agent Pipeline Link */}
            <Link
              href="/multi-agent"
              className="ml-4 flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 hover:border-purple-400 text-purple-400 px-4 py-2 rounded-lg transition-all duration-200"
            >
              <Brain className="w-4 h-4" />
              <span className="text-xs font-semibold">MULTI-AGENT</span>
              <ArrowRight className="w-3 h-3" />
            </Link>

            <div className="flex items-center gap-1 text-xs text-green-500/70 ml-auto">
              <Shield className="w-3 h-3" />
              <span>SECURE CONNECTION</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-green-500/70">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>ONLINE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-gray-900/50 border border-green-500/30 rounded-lg backdrop-blur-sm">
          {/* Messages */}
          <div className="h-[60vh] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <Code className="w-12 h-12 text-green-500/50 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-green-400 mb-2">NEXUS AI Agent Initialized</h2>
                <p className="text-green-500/70 text-sm mb-4">
                  Ready to assist with your queries. All communications encrypted.
                </p>
                <Link
                  href="/multi-agent"
                  className="inline-flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 hover:border-purple-400 text-purple-400 px-4 py-2 rounded-lg transition-all duration-200"
                >
                  <Brain className="w-4 h-4" />
                  <span className="text-sm">Try Multi-Agent Pipeline</span>
                </Link>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-green-500/20 border border-green-500/40 text-green-300"
                      : "bg-gray-800/50 border border-green-500/20 text-green-400"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-green-500">
                      {message.role === "user" ? "[USER]" : "[NEXUS]"}
                    </span>
                    <span className="text-xs text-green-500/50">{new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-800/50 border border-green-500/20 text-green-400 max-w-[80%] p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-green-500">[NEXUS]</span>
                    <span className="text-xs text-green-500/50">{new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm">Processing</span>
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse delay-100"></div>
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse delay-200"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="border-t border-green-500/30 p-4">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Enter your query..."
                  className="w-full bg-gray-800/50 border border-green-500/30 rounded-lg px-4 py-3 text-green-400 placeholder-green-500/50 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400/50"
                  disabled={isLoading}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Zap className="w-4 h-4 text-green-500/50" />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 hover:border-green-400 text-green-400 px-6 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">SEND</span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-green-500/50">
          <p>NEXUS AI Agent v2.1 | Powered by Llama 4 Scout | Secure Neural Network</p>
        </div>
      </div>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-green-500/5 via-transparent to-green-500/5"></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  )
}
