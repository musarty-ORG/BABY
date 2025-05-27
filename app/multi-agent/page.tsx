"use client"

import type React from "react"
import { useState } from "react"
import { Send, Code, Shield, Brain, Zap, CheckCircle, Clock, AlertTriangle, RotateCcw } from "lucide-react"
import type { PipelineResult, PipelineIteration } from "@/types/pipeline"

export default function MultiAgentPipeline() {
  const [prompt, setPrompt] = useState("")
  const [agentMode, setAgentMode] = useState<"code-gen" | "review" | "full-pipeline">("full-pipeline")
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>("")
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null)
  const [streamingResponse, setStreamingResponse] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsProcessing(true)
    setStreamingResponse("")
    setPipelineResult(null)
    setCurrentStep("Initializing pipeline...")

    try {
      if (agentMode === "full-pipeline") {
        setCurrentStep("Executing full pipeline with error handling...")

        const response = await fetch("/api/multi-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, agentMode }),
        })

        const result = await response.json()

        if (response.ok) {
          setPipelineResult(result)
        } else {
          // Handle API errors gracefully
          setPipelineResult({
            ...result,
            status: "FAILED",
          })
        }
      } else {
        // Handle streaming for individual agents
        setCurrentStep(`Running ${agentMode} with logging...`)

        const response = await fetch("/api/multi-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, agentMode }),
        })

        if (response.body) {
          const reader = response.body.getReader()
          const decoder = new TextDecoder()

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            setStreamingResponse((prev) => prev + chunk)
          }
        }
      }
    } catch (error) {
      console.error("Pipeline error:", error)
      setCurrentStep("Pipeline failed - check logs for details")
    } finally {
      setIsProcessing(false)
      setCurrentStep("")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "text-green-400"
      case "FAILED":
        return "text-red-400"
      case "PARTIAL":
        return "text-yellow-400"
      default:
        return "text-gray-400"
    }
  }

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case "APPROVE":
        return "text-green-400"
      case "REJECT":
        return "text-red-400"
      case "NEEDS_REVISION":
        return "text-yellow-400"
      default:
        return "text-gray-400"
    }
  }

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      {/* Header */}
      <div className="border-b border-green-500/30 bg-black/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-green-400" />
            <span className="text-xl font-bold text-green-400">MULTI-AGENT PIPELINE v2.0</span>

            <div className="ml-auto flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <Code className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400">v0-1.0-md</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400">Groq Supervisor</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Zap className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Orchestrator</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Agent Mode Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-green-400 mb-2">AGENT MODE:</label>
          <div className="flex gap-2">
            {[
              { value: "code-gen", label: "Code Generator (v0-1.0-md)", icon: Code },
              { value: "review", label: "Code Reviewer (Groq)", icon: Shield },
              { value: "full-pipeline", label: "Full Pipeline with Retry Logic", icon: Brain },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setAgentMode(value as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  agentMode === value
                    ? "bg-green-500/20 border-green-500/50 text-green-300"
                    : "bg-gray-800/50 border-green-500/20 text-green-500/70 hover:border-green-500/40"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="bg-gray-900/50 border border-green-500/30 rounded-lg p-4">
            <label className="block text-sm font-semibold text-green-400 mb-2">PROMPT:</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to build..."
              className="w-full h-32 bg-gray-800/50 border border-green-500/30 rounded-lg px-4 py-3 text-green-400 placeholder-green-500/50 focus:outline-none focus:border-green-400 resize-none"
              disabled={isProcessing}
            />
            <div className="flex justify-between items-center mt-4">
              <div className="text-xs text-green-500/70">
                {currentStep && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 animate-spin" />
                    <span>{currentStep}</span>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isProcessing || !prompt.trim()}
                className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 hover:border-green-400 text-green-400 px-6 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>EXECUTE PIPELINE</span>
              </button>
            </div>
          </div>
        </form>

        {/* Pipeline Results */}
        {pipelineResult && (
          <div className="space-y-6">
            {/* Pipeline Summary */}
            <div className="bg-gray-900/50 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  PIPELINE RESULTS
                </h3>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-green-500/70">Request ID: {pipelineResult.requestId}</span>
                  <span className={`font-semibold ${getStatusColor(pipelineResult.status)}`}>
                    {pipelineResult.status}
                  </span>
                  <span className="text-green-500/70">{pipelineResult.totalTime}ms</span>
                </div>
              </div>

              {/* Error Log */}
              {pipelineResult.errorLog && pipelineResult.errorLog.length > 0 && (
                <div className="mb-4 bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    ERROR LOG
                  </h4>
                  {pipelineResult.errorLog.map((error, index) => (
                    <div key={index} className="text-xs text-red-300 mb-1">
                      <span className="text-red-500">[{error.stage}]</span> {error.error}
                    </div>
                  ))}
                </div>
              )}

              {/* Iterations */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-green-400">PIPELINE ITERATIONS:</h4>
                {pipelineResult.iterations.map((iteration: PipelineIteration, index) => (
                  <div key={index} className="bg-gray-800/50 border border-green-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-semibold text-green-400 flex items-center gap-2">
                        <RotateCcw className="w-4 h-4" />
                        ITERATION {iteration.iterationNumber}
                      </h5>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${getVerdictColor(iteration.review.verdict)}`}>
                          {iteration.review.verdict}
                        </span>
                        <span className="text-xs text-green-500/70">Score: {iteration.review.qualityScore}/10</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Generated Code */}
                      <div className="bg-gray-900/50 border border-blue-500/30 rounded-lg p-3">
                        <h6 className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-2">
                          <Code className="w-3 h-3" />
                          v0-1.0-md OUTPUT ({iteration.rawCode.metadata?.generationTime}ms)
                        </h6>
                        <pre className="text-xs text-blue-300 bg-gray-900/50 p-2 rounded overflow-auto max-h-48">
                          {iteration.rawCode.code}
                        </pre>
                      </div>

                      {/* Review */}
                      <div className="bg-gray-900/50 border border-purple-500/30 rounded-lg p-3">
                        <h6 className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-2">
                          <Shield className="w-3 h-3" />
                          GROQ SUPERVISOR REVIEW ({iteration.review.metadata?.reviewTime}ms)
                        </h6>
                        <div className="space-y-2 text-xs">
                          {iteration.review.securityIssues.length > 0 && (
                            <div>
                              <span className="text-red-400 font-semibold">Security Issues:</span>
                              <ul className="text-red-300 ml-2">
                                {iteration.review.securityIssues.map((issue, i) => (
                                  <li key={i}>• {issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {iteration.review.performanceIssues.length > 0 && (
                            <div>
                              <span className="text-yellow-400 font-semibold">Performance Issues:</span>
                              <ul className="text-yellow-300 ml-2">
                                {iteration.review.performanceIssues.map((issue, i) => (
                                  <li key={i}>• {issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {iteration.review.suggestedFixes && iteration.review.suggestedFixes.length > 0 && (
                            <div>
                              <span className="text-green-400 font-semibold">Suggested Fixes:</span>
                              <ul className="text-green-300 ml-2">
                                {iteration.review.suggestedFixes.map((fix, i) => (
                                  <li key={i}>• {fix}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Final Code */}
              {pipelineResult.finalCode && (
                <div className="mt-4 bg-gray-800/50 border border-green-500/30 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-green-400 mb-2">FINAL APPROVED CODE:</h4>
                  <pre className="text-xs text-green-300 bg-gray-900/50 p-3 rounded overflow-auto max-h-64">
                    {pipelineResult.finalCode}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Streaming Response */}
        {streamingResponse && (
          <div className="bg-gray-900/50 border border-green-500/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-400 mb-4">AGENT OUTPUT</h3>
            <div className="text-sm text-green-300 bg-gray-800/50 p-3 rounded whitespace-pre-wrap">
              {streamingResponse}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
