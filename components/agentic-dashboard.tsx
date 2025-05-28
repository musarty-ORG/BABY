"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, Search, Code, Zap, Clock, TrendingUp, BarChart3, Cpu, CheckCircle } from "lucide-react"
import type { AgenticResponse } from "@/lib/agentic-engine"

interface AgenticStats {
  totalRequests: number
  averageLatency: number
  toolUsageBreakdown: {
    webSearch: number
    codeExecution: number
  }
  modelUsage: {
    "compound-beta": number
    "compound-beta-mini": number
  }
  successRate: number
}

export default function AgenticDashboard() {
  const [stats, setStats] = useState<AgenticStats>({
    totalRequests: 0,
    averageLatency: 0,
    toolUsageBreakdown: { webSearch: 0, codeExecution: 0 },
    modelUsage: { "compound-beta": 0, "compound-beta-mini": 0 },
    successRate: 100,
  })
  const [recentResponses, setRecentResponses] = useState<AgenticResponse[]>([])
  const [isComparing, setIsComparing] = useState(false)
  const [comparisonResult, setComparisonResult] = useState<any>(null)

  const handleModelComparison = async () => {
    setIsComparing(true)
    try {
      const response = await fetch("/api/agentic/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "What's the current weather in New York and calculate the temperature in Celsius?",
        }),
      })

      const result = await response.json()
      if (result.success) {
        setComparisonResult(result.data)
      }
    } catch (error) {
      console.error("Comparison failed:", error)
    } finally {
      setIsComparing(false)
    }
  }

  const addResponse = (response: AgenticResponse) => {
    setRecentResponses((prev) => [response, ...prev.slice(0, 4)])

    // Update stats
    setStats((prev) => ({
      totalRequests: prev.totalRequests + 1,
      averageLatency: (prev.averageLatency * prev.totalRequests + response.totalDuration) / (prev.totalRequests + 1),
      toolUsageBreakdown: {
        webSearch: prev.toolUsageBreakdown.webSearch + response.toolCalls.filter((t) => t.type === "web_search").length,
        codeExecution:
          prev.toolUsageBreakdown.codeExecution + response.toolCalls.filter((t) => t.type === "code_execution").length,
      },
      modelUsage: {
        ...prev.modelUsage,
        [response.model]: prev.modelUsage[response.model] + 1,
      },
      successRate: prev.successRate, // Assume success for now
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gray-900/50 border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-purple-400" />
            <span className="text-purple-400">Agentic AI Dashboard</span>
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">Real-time Analytics</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-green-400">{stats.totalRequests}</p>
                <p className="text-sm text-gray-400">Total Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-blue-400">{Math.round(stats.averageLatency)}ms</p>
                <p className="text-sm text-gray-400">Avg Latency</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-yellow-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-yellow-400">{stats.successRate}%</p>
                <p className="text-sm text-gray-400">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-purple-400">
                  {stats.toolUsageBreakdown.webSearch + stats.toolUsageBreakdown.codeExecution}
                </p>
                <p className="text-sm text-gray-400">Tools Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tool Usage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400">Tool Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400">Web Search</span>
                </div>
                <span className="text-blue-400 font-semibold">{stats.toolUsageBreakdown.webSearch}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Code Execution</span>
                </div>
                <span className="text-green-400 font-semibold">{stats.toolUsageBreakdown.codeExecution}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-blue-400">Model Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-400">compound-beta</span>
                </div>
                <span className="text-purple-400 font-semibold">{stats.modelUsage["compound-beta"]}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400">compound-beta-mini</span>
                </div>
                <span className="text-yellow-400 font-semibold">{stats.modelUsage["compound-beta-mini"]}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Comparison */}
      <Card className="bg-gray-900/50 border-orange-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-400">
            <BarChart3 className="w-5 h-5" />
            Model Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={handleModelComparison}
              disabled={isComparing}
              className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-400"
            >
              {isComparing ? (
                <>
                  <Zap className="w-4 h-4 mr-2 animate-spin" />
                  Comparing Models...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Run Comparison Test
                </>
              )}
            </Button>

            {comparisonResult && (
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-orange-400">Comparison Results:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h5 className="font-medium text-purple-400">compound-beta</h5>
                    <div className="text-gray-300">
                      <div>Latency: {comparisonResult.beta.totalDuration}ms</div>
                      <div>Tools: {comparisonResult.beta.toolCalls.length}</div>
                      <div>Response Length: {comparisonResult.beta.content.length} chars</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h5 className="font-medium text-yellow-400">compound-beta-mini</h5>
                    <div className="text-gray-300">
                      <div>Latency: {comparisonResult.mini.totalDuration}ms</div>
                      <div>Tools: {comparisonResult.mini.toolCalls.length}</div>
                      <div>Response Length: {comparisonResult.mini.content.length} chars</div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-600 pt-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-medium">
                      Recommended: {comparisonResult.comparison.recommendation}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Latency difference: {comparisonResult.comparison.latencyDifference}ms
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Responses */}
      {recentResponses.length > 0 && (
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400">Recent Agentic Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentResponses.map((response, index) => (
                <div key={index} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                        {response.model}
                      </span>
                      <span className="text-xs text-gray-400">{response.totalDuration}ms</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {response.toolCalls.map((tool, toolIndex) => (
                        <span key={toolIndex} className="text-xs">
                          {tool.type === "web_search" ? (
                            <Search className="w-3 h-3 text-blue-400" />
                          ) : (
                            <Code className="w-3 h-3 text-green-400" />
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 truncate">{response.content.substring(0, 100)}...</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
