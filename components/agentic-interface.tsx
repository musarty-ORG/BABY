"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Send, Bot, Search, Code, Zap, Clock, CheckCircle, Cpu, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AgenticResponse } from "@/lib/agentic-engine"

interface AgenticInterfaceProps {
  onResponse?: (response: AgenticResponse) => void
  className?: string
}

export default function AgenticInterface({ onResponse, className = "" }: AgenticInterfaceProps) {
  const [query, setQuery] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [response, setResponse] = useState<AgenticResponse | null>(null)
  const [model, setModel] = useState<"compound-beta" | "compound-beta-mini">("compound-beta")
  const [enableWebSearch, setEnableWebSearch] = useState(true)
  const [enableCodeExecution, setEnableCodeExecution] = useState(true)
  const [streamingContent, setStreamingContent] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isProcessing) return

    setIsProcessing(true)
    setResponse(null)
    setStreamingContent("")

    try {
      const response = await fetch("/api/agentic/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          model,
          enableWebSearch,
          enableCodeExecution,
          maxToolCalls: model === "compound-beta" ? 5 : 1,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setResponse(result.data)
        onResponse?.(result.data)
      } else {
        console.error("Agentic processing failed:", result.error)
      }
    } catch (error) {
      console.error("Request failed:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStreamingSubmit = async () => {
    if (!query.trim() || isStreaming) return

    setIsStreaming(true)
    setStreamingContent("")
    setResponse(null)

    try {
      const response = await fetch("/api/agentic/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          model,
          enableWebSearch,
          enableCodeExecution,
        }),
      })

      if (!response.body) throw new Error("No response body")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        setStreamingContent((prev) => prev + chunk)
      }
    } catch (error) {
      console.error("Streaming failed:", error)
    } finally {
      setIsStreaming(false)
    }
  }

  const quickQueries = [
    "What's the current weather in Tokyo?",
    "Calculate the compound interest on $10,000 at 5% for 10 years",
    "Search for the latest AI developments in 2025",
    "Write and test a Python function to find prime numbers",
    "What are the current stock prices for AAPL and GOOGL?",
    "Analyze the performance of different sorting algorithms",
  ]

  const getToolIcon = (type: string) => {
    switch (type) {
      case "web_search":
        return <Search className="w-4 h-4 text-blue-400" />
      case "code_execution":
        return <Code className="w-4 h-4 text-green-400" />
      default:
        return <Zap className="w-4 h-4 text-purple-400" />
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="bg-gray-900/50 border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-purple-400" />
            <span className="text-purple-400">Agentic AI Tooling</span>
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">Groq Compound-Beta</span>
          </CardTitle>
          <p className="text-sm text-gray-400">Advanced AI with real-time web search and code execution capabilities</p>
        </CardHeader>
      </Card>

      {/* Configuration */}
      <Card className="bg-gray-900/50 border-green-500/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as "compound-beta" | "compound-beta-mini")}
                className="w-full bg-gray-800 border border-green-500/30 rounded-lg px-3 py-2 text-green-300"
              >
                <option value="compound-beta">compound-beta (Multi-tool)</option>
                <option value="compound-beta-mini">compound-beta-mini (Single-tool, 3x faster)</option>
              </select>
            </div>

            {/* Tool Toggles */}
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Tools</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-green-300">
                  <input
                    type="checkbox"
                    checked={enableWebSearch}
                    onChange={(e) => setEnableWebSearch(e.target.checked)}
                    className="rounded"
                  />
                  <Globe className="w-4 h-4" />
                  Web Search (Tavily)
                </label>
                <label className="flex items-center gap-2 text-sm text-green-300">
                  <input
                    type="checkbox"
                    checked={enableCodeExecution}
                    onChange={(e) => setEnableCodeExecution(e.target.checked)}
                    className="rounded"
                  />
                  <Cpu className="w-4 h-4" />
                  Code Execution (E2B)
                </label>
              </div>
            </div>

            {/* Model Info */}
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Capabilities</label>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Max Tools: {model === "compound-beta" ? "Multiple" : "Single"}</div>
                <div>Latency: {model === "compound-beta" ? "Standard" : "3x Faster"}</div>
                <div>Best for: {model === "compound-beta" ? "Complex tasks" : "Quick queries"}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Query Input */}
      <Card className="bg-gray-900/50 border-blue-500/30">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-400 mb-2">
                Ask anything - I'll use the right tools automatically
              </label>
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What's the current weather in Tokyo? Calculate compound interest? Search for AI news? Write and test code?"
                className="w-full bg-gray-800 border border-blue-500/30 rounded-lg px-4 py-3 text-blue-300 placeholder-gray-500 resize-none"
                rows={3}
                disabled={isProcessing || isStreaming}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isProcessing || isStreaming || !query.trim()}
                className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400"
              >
                {isProcessing ? (
                  <>
                    <Zap className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={handleStreamingSubmit}
                disabled={isProcessing || isStreaming || !query.trim()}
                className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-400"
              >
                {isStreaming ? (
                  <>
                    <Zap className="w-4 h-4 mr-2 animate-pulse" />
                    Streaming...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Stream
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Quick Queries */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-blue-400 mb-2">Quick Examples:</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {quickQueries.map((quickQuery, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(quickQuery)}
                  className="text-left text-xs bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 rounded px-3 py-2 text-gray-300 transition-colors"
                >
                  {quickQuery}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streaming Response */}
      {isStreaming && streamingContent && (
        <Card className="bg-gray-900/50 border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-400">
              <Zap className="w-5 h-5 animate-pulse" />
              Streaming Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-800/50 rounded-lg p-4 font-mono text-sm text-green-300 whitespace-pre-wrap">
              {streamingContent}
              <span className="animate-pulse">▊</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response */}
      {response && (
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              Agentic Response
              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">{response.model}</span>
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {response.totalDuration}ms
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                {response.toolCalls.length} tools used
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tool Calls */}
            {response.toolCalls.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-400 mb-3">Tools Used:</h4>
                <div className="space-y-3">
                  {response.toolCalls.map((tool, index) => (
                    <div key={tool.id} className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {getToolIcon(tool.type)}
                        <span className="text-sm font-medium text-gray-300">
                          {tool.type === "web_search" ? "Web Search" : "Code Execution"}
                        </span>
                        <span className="text-xs text-gray-500">({tool.duration}ms)</span>
                      </div>
                      <div className="text-xs text-gray-400 space-y-1">
                        <div>
                          <strong>Input:</strong> {JSON.stringify(tool.input, null, 2)}
                        </div>
                        <div>
                          <strong>Output:</strong> {JSON.stringify(tool.output, null, 2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Response */}
            <div>
              <h4 className="text-sm font-medium text-green-400 mb-3">Response:</h4>
              <div className="bg-gray-800/50 rounded-lg p-4 text-green-300 whitespace-pre-wrap">{response.content}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
