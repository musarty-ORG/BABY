"use client"

import type React from "react"
import VoiceInterface from "@/components/voice-interface" // Import VoiceInterface component
import PredictiveInsightsPanel from "@/components/predictive-insights-panel" // Import PredictiveInsightsPanel component

import {
  Code,
  Send,
  Globe,
  Zap,
  Clock,
  ExternalLink,
  Brain,
  Volume2,
  Eye,
  MousePointer,
  Home,
  Maximize2,
  Minimize2,
  Settings,
  Download,
} from "lucide-react"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Shell } from "@/components/shell"
import type { ChatCompletionRequestMessage } from "openai"
import type { PipelineResult, StylePreferences, VoiceCommand } from "@/types/pipeline"
import JSZip from "jszip"
import * as FileSaver from "file-saver"

const defaultMessages: ChatCompletionRequestMessage[] = [
  {
    role: "system",
    content: "You are a friendly chatbot named Chatty. You can answer questions about a variety of topics.",
  },
]

export default function MultiAgentPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>(defaultMessages)
  const [prompt, setPrompt] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>("")
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [showStyleOptions, setShowStyleOptions] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [showPredictivePanel, setShowPredictivePanel] = useState(false)
  const [isVoiceListening, setIsVoiceListening] = useState(false)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<"split" | "fullscreen">("split")
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string>("")
  const [showDevTools, setShowDevTools] = useState(false)

  const previewRef = useRef<HTMLIFrameElement>(null)

  // Style preferences state
  const [stylePreferences, setStylePreferences] = useState<StylePreferences>({
    colorScheme: "light",
    layoutStyle: "modern",
    typography: "sans-serif",
    animations: true,
    borderRadius: "medium",
  })

  // Voice command handler
  const handleVoiceCommand = async (command: VoiceCommand) => {
    setLastVoiceCommand(command.transcript)
    console.log("Voice command received:", command)

    // Apply voice command to selected element or general page
    if (pipelineResult?.codeFiles) {
      try {
        // Here you would implement the logic to modify the code based on voice commands
        // For now, we'll just show the command was received
        setCurrentStep(`Applied voice command: "${command.transcript}"`)
        setTimeout(() => setCurrentStep(""), 3000)
      } catch (error) {
        console.error("Failed to apply voice command:", error)
      }
    }
  }

  // Handle element selection in preview
  const handleElementSelect = (elementId: string) => {
    setSelectedElement(elementId)
    // Highlight the selected element in the preview
    if (previewRef.current) {
      const previewDoc = previewRef.current.contentDocument
      if (previewDoc) {
        // Remove previous highlights
        previewDoc.querySelectorAll(".voice-selected").forEach((el) => {
          el.classList.remove("voice-selected")
        })
        // Add highlight to selected element
        const element = previewDoc.getElementById(elementId)
        if (element) {
          element.classList.add("voice-selected")
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsProcessing(true)
    setCurrentStep("🔧 Initializing development agentic tools...")
    setPipelineResult(null)
    setSelectedFile(null)

    try {
      setCurrentStep("🤖 Using compound-beta for package resolution...")

      const response = await fetch("/api/multi-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          fileUrl: fileUrl || undefined,
          agentMode: "full-pipeline",
          mode: "codegen",
          stylePreferences,
          useAgenticTools: true, // Enable development agentic tools
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setPipelineResult(result)
        setCurrentStep("✅ Website generated with agentic tool assistance!")
        setShowPredictivePanel(true)

        // Show development insights if available
        if (result.metadata?.agenticEnhancement) {
          setShowDevTools(true)
        }
      } else {
        setPipelineResult({
          ...result,
          status: "FAILED",
        })
        setCurrentStep("❌ Website generation failed - check logs for details")
      }
    } catch (error) {
      console.error("Pipeline error:", error)
      setCurrentStep("❌ Pipeline failed - check logs for details")
    } finally {
      setIsProcessing(false)
      setTimeout(() => setCurrentStep(""), 3000)
    }
  }

  const handleDeploy = async () => {
    if (!pipelineResult?.codeFiles) return

    setIsDeploying(true)
    setCurrentStep("🚀 Deploying to Vercel...")

    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeFiles: pipelineResult.codeFiles,
          projectName: prompt.split(" ").slice(0, 3).join("-"),
          requestId: pipelineResult.requestId,
        }),
      })

      const deployResult = await response.json()

      if (deployResult.success) {
        setPipelineResult({
          ...pipelineResult,
          deploymentUrl: deployResult.deploymentUrl,
          githubRepo: deployResult.githubRepo,
        })
        setCurrentStep("✅ Deployment successful!")
      } else {
        setCurrentStep(`❌ Deployment failed: ${deployResult.error}`)
      }
    } catch (error) {
      console.error("Deployment error:", error)
      setCurrentStep("❌ Deployment failed - check logs for details")
    } finally {
      setIsDeploying(false)
      setTimeout(() => setCurrentStep(""), 3000)
    }
  }

  const downloadZip = async () => {
    if (!pipelineResult?.codeFiles) return

    const zip = new JSZip()

    Object.entries(pipelineResult.codeFiles).forEach(([filePath, content]) => {
      zip.file(filePath, content)
    })

    const readme = `# Generated Website with Development Agentic Tools

This website was generated using the NEXUS AI Multi-Agent Pipeline with Development Agentic Tools.

## Original Prompt
${pipelineResult.originalPrompt}

## Development Tools Used
${pipelineResult.metadata?.agenticToolsUsed ? `- ${pipelineResult.metadata.agenticToolsUsed} agentic tool calls` : "- Standard generation"}
${
  pipelineResult.metadata?.agenticEnhancement?.recommendations
    ? `
## AI Recommendations
${pipelineResult.metadata.agenticEnhancement.recommendations.map((rec: string) => `- ${rec}`).join("\n")}
`
    : ""
}

${
  pipelineResult.metadata?.agenticEnhancement?.dependencies
    ? `
## Dependencies Resolved
${pipelineResult.metadata.agenticEnhancement.dependencies.map((dep: string) => `- ${dep}`).join("\n")}
`
    : ""
}

${
  pipelineResult.metadata?.agenticEnhancement?.setupInstructions
    ? `
## Setup Instructions
${pipelineResult.metadata.agenticEnhancement.setupInstructions.map((inst: string) => `- ${inst}`).join("\n")}
`
    : ""
}

## Generated Files
${Object.keys(pipelineResult.codeFiles)
  .map((file) => `- ${file}`)
  .join("\n")}

## Pipeline Stats
- Request ID: ${pipelineResult.requestId}
- Status: ${pipelineResult.status}
- Total Time: ${pipelineResult.totalTime}ms
- Iterations: ${pipelineResult.iterations.length}

${pipelineResult.deploymentUrl ? `## Live Deployment\n${pipelineResult.deploymentUrl}` : ""}
${pipelineResult.githubRepo ? `## GitHub Repository\n${pipelineResult.githubRepo}` : ""}

Generated by NEXUS AI Pipeline v2.0 with Development Agentic Tools (May 2025)
`

    zip.file("README.md", readme)

    const content = await zip.generateAsync({ type: "blob" })
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
    FileSaver.saveAs(content, `nexus-website-${timestamp}.zip`)
  }

  const handleApplyFix = (filePath: string, fixedCode: string) => {
    if (pipelineResult?.codeFiles) {
      setPipelineResult({
        ...pipelineResult,
        codeFiles: {
          ...pipelineResult.codeFiles,
          [filePath]: fixedCode,
        },
      })
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

  const getFileIcon = (filePath: string) => {
    if (filePath.endsWith(".tsx") || filePath.endsWith(".ts")) return <Code className="w-4 h-4 text-blue-400" />
    if (filePath.endsWith(".css")) return <Code className="w-4 h-4 text-purple-400" />
    if (filePath.endsWith(".json")) return <Code className="w-4 h-4 text-yellow-400" />
    if (filePath.endsWith(".js")) return <Code className="w-4 h-4 text-green-400" />
    return <Code className="w-4 h-4 text-gray-400" />
  }

  useEffect(() => {
    window.handleElementSelect = handleElementSelect
  }, [])

  return (
    <Shell>
      <div className="min-h-screen bg-black text-green-400 font-mono">
        {/* Header */}
        <div className="border-b border-purple-500/30 bg-black/90 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hndkjn-12r7gakfDUd4Wz8G5F2UxDVU7EKkCj.png"
                alt="Code Homie Logo"
                className="w-8 h-8 rounded-lg"
              />
              <Globe className="w-6 h-6 text-purple-400" />
              <span className="text-xl font-bold text-purple-400">CODE HOMIE v2.0</span>

              <nav className="ml-8 flex items-center gap-6">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors font-semibold hover:border-b-2 hover:border-purple-400 pb-1"
                >
                  <Home className="w-4 h-4" />
                  Home
                </Link>
                <Link
                  href="/multi-agent"
                  className="flex items-center gap-2 text-purple-400 font-semibold border-b-2 border-purple-400 pb-1"
                >
                  <Brain className="w-4 h-4" />
                  CODE HOMIE
                </Link>
              </nav>

              <div className="ml-auto flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs">
                  <Code className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400">compound-beta</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-400">Dev Agentic Tools</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Zap className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">AI-Powered</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Split Screen Layout */}
          <div className={`grid ${previewMode === "split" ? "lg:grid-cols-2" : "grid-cols-1"} gap-6`}>
            {/* Left Panel - Controls */}
            <div className={`space-y-6 ${previewMode === "fullscreen" ? "hidden" : ""}`}>
              {/* Input Form */}
              <form onSubmit={handleSubmit}>
                <div className="bg-gray-900/50 border border-purple-500/30 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      WEBSITE GENERATOR
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">Dev Agentic</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setPreviewMode(previewMode === "split" ? "fullscreen" : "split")}
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {previewMode === "split" ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-purple-400 mb-2">WEBSITE DESCRIPTION:</label>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe the website you want to build (e.g., 'A modern SaaS landing page for a project management tool with pricing section and testimonials')"
                        className="w-full h-32 bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-3 text-purple-400 placeholder-purple-500/50 focus:outline-none focus:border-purple-400 resize-none"
                        disabled={isProcessing}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-purple-400 mb-2">
                        TEMPLATE URL (OPTIONAL):
                      </label>
                      <input
                        type="url"
                        value={fileUrl}
                        onChange={(e) => setFileUrl(e.target.value)}
                        placeholder="https://example.com/template-reference (optional)"
                        className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-3 text-purple-400 placeholder-purple-500/50 focus:outline-none focus:border-purple-400"
                        disabled={isProcessing}
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-purple-500/70">
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
                        className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-8 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>GENERATE WEBSITE</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Development Tools Panel */}
              {showDevTools && pipelineResult?.metadata?.agenticEnhancement && (
                <div className="bg-gray-900/50 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-400 mb-3">
                    <Settings className="w-4 h-4" />
                    <span className="text-sm font-semibold">DEVELOPMENT AGENTIC INSIGHTS</span>
                  </div>

                  {pipelineResult.metadata.agenticEnhancement.recommendations.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-xs font-medium text-green-400 mb-2">AI Recommendations:</h4>
                      <div className="space-y-1">
                        {pipelineResult.metadata.agenticEnhancement.recommendations.map(
                          (rec: string, index: number) => (
                            <div key={index} className="text-xs text-green-300/80">
                              • {rec}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {pipelineResult.metadata.agenticEnhancement.dependencies.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-xs font-medium text-green-400 mb-2">Dependencies Resolved:</h4>
                      <div className="flex flex-wrap gap-1">
                        {pipelineResult.metadata.agenticEnhancement.dependencies.map((dep: string, index: number) => (
                          <span key={index} className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                            {dep}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-green-500/70">
                    🤖 {pipelineResult.metadata.agenticToolsUsed} agentic tool calls used
                  </div>
                </div>
              )}

              {/* Voice Interface */}
              <VoiceInterface
                onVoiceCommand={handleVoiceCommand}
                onSpeechResponse={(text) => {
                  console.log("AI Response:", text)
                }}
              />

              {/* Voice Command Status */}
              {lastVoiceCommand && (
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <Volume2 className="w-4 h-4" />
                    <span className="text-sm font-semibold">Last Voice Command:</span>
                  </div>
                  <p className="text-purple-300/80 text-sm">"{lastVoiceCommand}"</p>
                  {selectedElement && <p className="text-purple-500/70 text-xs mt-1">Target: {selectedElement}</p>}
                </div>
              )}

              {/* File Structure */}
              {pipelineResult?.codeFiles && (
                <div className="bg-gray-900/50 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-purple-400 mb-3">GENERATED FILES</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {Object.keys(pipelineResult.codeFiles).map((filePath) => (
                      <button
                        key={filePath}
                        onClick={() => setSelectedFile(filePath)}
                        className={`w-full text-left flex items-center gap-2 p-2 rounded transition-all ${
                          selectedFile === filePath
                            ? "bg-purple-500/20 border border-purple-500/40 text-purple-300"
                            : "bg-gray-700/50 hover:bg-gray-700 text-purple-500/70 hover:text-purple-400"
                        }`}
                      >
                        {getFileIcon(filePath)}
                        <span className="text-xs font-mono truncate">{filePath}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - Live Preview */}
            <div className="space-y-6">
              {/* Preview Header */}
              <div className="bg-gray-900/50 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-lg font-semibold text-cyan-400">LIVE PREVIEW</h3>
                    {selectedElement && (
                      <span className="text-xs bg-purple-500/20 border border-purple-500/40 rounded px-2 py-1 text-purple-300">
                        Selected: {selectedElement}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {pipelineResult?.deploymentUrl && (
                      <a
                        href={pipelineResult.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 px-3 py-2 rounded text-sm transition-all"
                      >
                        <ExternalLink className="w-4 h-4 inline mr-1" />
                        Live Site
                      </a>
                    )}
                    <button
                      onClick={downloadZip}
                      disabled={!pipelineResult?.codeFiles}
                      className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 px-3 py-2 rounded text-sm transition-all disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 inline mr-1" />
                      Download
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview Frame */}
              <div className="bg-gray-900/50 border border-purple-500/30 rounded-lg p-4">
                {pipelineResult?.codeFiles ? (
                  <div className="relative">
                    <iframe
                      ref={previewRef}
                      className="w-full h-[600px] bg-white rounded-lg border border-gray-300"
                      title="Website Preview"
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1">
                            <title>Preview</title>
                            <script src="https://cdn.tailwindcss.com"></script>
                            <style>
                              .voice-selected {
                                outline: 3px solid #8B5CF6 !important;
                                outline-offset: 2px !important;
                                background-color: rgba(139, 92, 246, 0.1) !important;
                              }
                              * {
                                cursor: pointer !important;
                              }
                            </style>
                          </head>
                          <body>
                            ${pipelineResult.codeFiles["app/page.tsx"] || pipelineResult.codeFiles["index.html"] || "<div class='p-8 text-center'>No preview available</div>"}
                            <script>
                              document.addEventListener('click', function(e) {
                                e.preventDefault();
                                const element = e.target;
                                const elementId = element.id || element.tagName.toLowerCase() + '_' + Math.random().toString(36).substr(2, 9);
                                if (!element.id) element.id = elementId;
                                window.parent.postMessage({type: 'elementSelected', elementId: elementId}, '*');
                              });
                            </script>
                          </body>
                        </html>
                      `}
                    />
                    <div className="absolute top-2 right-2 bg-black/80 text-cyan-400 px-2 py-1 rounded text-xs">
                      <MousePointer className="w-3 h-3 inline mr-1" />
                      Click elements to select for voice commands
                    </div>
                  </div>
                ) : (
                  <div className="h-[600px] flex items-center justify-center text-purple-500/50">
                    <div className="text-center">
                      <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Generate a website to see live preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Predictive Insights Panel */}
          {showPredictivePanel && pipelineResult?.codeFiles && (
            <div className="mt-6">
              <PredictiveInsightsPanel
                codeFiles={pipelineResult.codeFiles}
                projectType="nextjs"
                userId="demo-user"
                onApplyFix={handleApplyFix}
              />
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
