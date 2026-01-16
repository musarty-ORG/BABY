"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Send, Code, Download, FileText, Globe, Zap, CheckCircle, Clock, AlertTriangle, Palette, Upload, ExternalLink, Brain, Settings, Shield, Eye, EyeOff, Package } from 'lucide-react'
import type { PipelineResult, StylePreferences } from "@/types/pipeline"
import JSZip from "jszip"
import saveAs from "file-saver"
import PredictiveInsightsPanel from "@/components/predictive-insights-panel"
import { AVAILABLE_REGISTRIES, searchComponents } from "@/lib/component-registries"
import { SiteHeader } from "@/components/site-header"

export default function MultiAgentPipeline() {
  const [prompt, setPrompt] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>("")
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [showStyleOptions, setShowStyleOptions] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [showPredictivePanel, setShowPredictivePanel] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewLocked, setPreviewLocked] = useState(false)
  const [useDualModel, setUseDualModel] = useState(false) // Default to single agent for production
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [adminKeySequence, setAdminKeySequence] = useState("")
  const [showRegistries, setShowRegistries] = useState(false)

  // Admin panel settings
  const [adminSettings, setAdminSettings] = useState({
    primaryModel: "claude-3-sonnet-20240229",
    secondaryModel: "meta-llama/llama-3.1-70b-versatile",
    enableRealTimeSearch: true,
    maxTokens: 4000,
    temperature: 0.7,
    enableRegistries: true,
  })

  // Listen for admin key sequence (Ctrl+Shift+A+D+M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        const newSequence = adminKeySequence + e.key.toLowerCase()
        setAdminKeySequence(newSequence)
        
        if (newSequence.includes("adm")) {
          setShowAdminPanel(true)
          setAdminKeySequence("")
        }
        
        // Reset sequence after 3 seconds
        setTimeout(() => setAdminKeySequence(""), 3000)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [adminKeySequence])

  // Style preferences state
  const [stylePreferences, setStylePreferences] = useState<StylePreferences>({
    colorScheme: "light",
    layoutStyle: "modern",
    typography: "sans-serif",
    animations: true,
    borderRadius: "medium",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsProcessing(true)
    setCurrentStep("Initializing website generation pipeline...")
    setPipelineResult(null)
    setSelectedFile(null)
    setPreviewLocked(true) // Lock preview during generation
    setShowPreview(false)

    try {
      setCurrentStep("Generating complete Next.js website with AI...")

      const response = await fetch("/api/multi-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          fileUrl: fileUrl || undefined,
          agentMode: "full-pipeline", // Always use full pipeline for production
          mode: "codegen",
          stylePreferences,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setPipelineResult(result)
        setCurrentStep("Website generation complete!")
        setShowPredictivePanel(true) // Auto-show predictive panel after generation
        setPreviewLocked(false) // Unlock preview after generation
        setShowPreview(true) // Show preview automatically
      } else {
        setPipelineResult({
          ...result,
          status: "FAILED",
        })
        setCurrentStep("Website generation failed - check logs for details")
      }
    } catch (error) {
      console.error("Pipeline error:", error)
      setCurrentStep("Pipeline failed - check logs for details")
    } finally {
      setIsProcessing(false)
      setTimeout(() => setCurrentStep(""), 3000)
    }
  }

  const handleDeploy = async () => {
    if (!pipelineResult?.codeFiles) return

    setIsDeploying(true)
    setCurrentStep("Deploying to Vercel...")

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
        setCurrentStep("Deployment successful!")
      } else {
        setCurrentStep(`Deployment failed: ${deployResult.error}`)
      }
    } catch (error) {
      console.error("Deployment error:", error)
      setCurrentStep("Deployment failed - check logs for details")
    } finally {
      setIsDeploying(false)
      setTimeout(() => setCurrentStep(""), 3000)
    }
  }

  const downloadZip = async () => {
    if (!pipelineResult?.codeFiles) return

    const zip = new JSZip()

    // Add all files to the zip
    Object.entries(pipelineResult.codeFiles).forEach(([filePath, content]) => {
      zip.file(filePath, content)
    })

    // Add a README.md file
    const readme = `# Generated Next.js Website

This website was generated using the NEXUS AI Multi-Agent Pipeline with Predictive Code Evolution.

## Original Prompt
${pipelineResult.originalPrompt}

## Generated Files
${Object.keys(pipelineResult.codeFiles)
  .map((file) => `- ${file}`)
  .join("\n")}

## Setup Instructions
1. Extract this ZIP file
2. Run \`npm install\` to install dependencies
3. Run \`npm run dev\` to start the development server
4. Open http://localhost:3000 in your browser

## Pipeline Stats
- Request ID: ${pipelineResult.requestId}
- Status: ${pipelineResult.status}
- Total Time: ${pipelineResult.totalTime}ms
- Iterations: ${pipelineResult.iterations.length}

${pipelineResult.deploymentUrl ? `## Live Deployment\n${pipelineResult.deploymentUrl}` : ""}
${pipelineResult.githubRepo ? `## GitHub Repository\n${pipelineResult.githubRepo}` : ""}

Generated by NEXUS AI Pipeline v2.0 with Predictive Code Evolution
`

    zip.file("README.md", readme)

    try {
      // Generate and download the zip
      const content = await zip.generateAsync({ type: "blob" })
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
      saveAs(content, `nexus-website-${timestamp}.zip`)
    } catch (error) {
      console.error("Download failed:", error)
      setCurrentStep("Download failed - please try again")
    }
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
        return "text-cyan-400"
      case "FAILED":
        return "text-red-400"
      case "PARTIAL":
        return "text-yellow-400"
      default:
        return "text-gray-400"
    }
  }

  const getFileIcon = (filePath: string) => {
    if (filePath.endsWith(".tsx") || filePath.endsWith(".ts")) return <Code className="w-4 h-4 text-cyan-400" />
    if (filePath.endsWith(".css")) return <FileText className="w-4 h-4 text-purple-400" />
    if (filePath.endsWith(".json")) return <FileText className="w-4 h-4 text-yellow-400" />
    if (filePath.endsWith(".js")) return <Code className="w-4 h-4 text-cyan-400" />
    return <FileText className="w-4 h-4 text-gray-400" />
  }

  const getPreviewHTML = () => {
    if (!pipelineResult?.codeFiles) return "<html><body><h1>No preview available</h1></body></html>"
    
    // Try to find the main HTML file first (for static sites)
    const indexHtml = pipelineResult.codeFiles["index.html"] || 
                      pipelineResult.codeFiles["public/index.html"]
    
    if (indexHtml && (indexHtml.includes("<html") || indexHtml.includes("<!DOCTYPE"))) {
      // Include Tailwind CSS CDN if styles are referenced
      if (indexHtml.includes("tailwind") || Object.keys(pipelineResult.codeFiles).some(f => f.includes("tailwind"))) {
        return indexHtml.replace(
          '</head>',
          '<script src="https://cdn.tailwindcss.com"></script></head>'
        )
      }
      return indexHtml
    }

    // Try to find React/Next.js pages
    const reactPages = [
      pipelineResult.codeFiles["src/App.tsx"],
      pipelineResult.codeFiles["src/App.jsx"],
      pipelineResult.codeFiles["app/page.tsx"],
      pipelineResult.codeFiles["pages/index.tsx"],
      pipelineResult.codeFiles["pages/index.jsx"]
    ].find(f => f)

    if (reactPages) {
      // Create a more robust React preview
      return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Preview</title>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
        * { box-sizing: border-box; }
        #root { min-height: 100vh; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        try {
          // Remove imports and exports to make it work in browser
          const code = \`${reactPages
            .replace(/`/g, '\\`')
            .replace(/\$/g, '\\$')
            .replace(/import\s+.*?from\s+['"].*?['"]/g, '')
            .replace(/export\s+default\s+/g, 'const App = ')
            .replace(/export\s+{[^}]*}/g, '')
          }\`;
          
          // Evaluate the code
          eval(code);
          
          // Render the component
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(React.createElement(App || (() => React.createElement('div', {className: 'p-4'}, 'Component loaded'))));
        } catch (error) {
          document.getElementById('root').innerHTML = \`
            <div style="padding: 20px; background: #fee2e2; color: #991b1b; border-radius: 8px; margin: 20px; border: 2px solid #fca5a5;">
              <h3 style="margin-top: 0; font-weight: bold;">⚠️ Preview Unavailable</h3>
              <p>The generated code requires a full build environment to preview properly.</p>
              <p style="margin-bottom: 0;"><strong>Next steps:</strong></p>
              <ul style="margin-top: 8px;">
                <li>Click <strong>"Deploy to Vercel"</strong> to see the live version</li>
                <li>Or <strong>"Download ZIP"</strong> to run it locally with npm</li>
              </ul>
              <details style="margin-top: 12px; padding: 12px; background: white; border-radius: 4px;">
                <summary style="cursor: pointer; font-weight: 600;">Technical Details</summary>
                <pre style="margin-top: 8px; padding: 8px; background: #f3f4f6; border-radius: 4px; overflow-x: auto; font-size: 12px;">\${error.message}</pre>
              </details>
            </div>
          \`;
        }
    </script>
</body>
</html>`
    }

    // Default: Show file structure preview
    const fileList = Object.keys(pipelineResult.codeFiles)
    const fileCount = fileList.length
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Website - ${fileCount} Files</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-purple-50 to-blue-50">
    <div class="max-w-4xl mx-auto p-8">
        <div class="bg-white rounded-xl shadow-lg p-8">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white text-2xl">
                    🚀
                </div>
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">Website Generated Successfully!</h1>
                    <p class="text-gray-600">Your complete website is ready to deploy</p>
                </div>
            </div>
            
            <div class="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-6 mb-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-2">📦 Generated ${fileCount} Files</h2>
                <p class="text-gray-700 mb-4">A complete, production-ready website structure</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    ${fileList.slice(0, 12).map(file => `
                        <div class="bg-white rounded px-3 py-2 text-sm font-mono text-gray-700 truncate" title="${file}">
                            📄 ${file}
                        </div>
                    `).join('')}
                    ${fileCount > 12 ? `<div class="col-span-2 text-center text-sm text-gray-600">+ ${fileCount - 12} more files...</div>` : ''}
                </div>
            </div>

            <div class="space-y-4">
                <h3 class="text-lg font-semibold text-gray-900">🎯 Next Steps</h3>
                
                <div class="flex gap-3">
                    <div class="flex-1 bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                        <h4 class="font-semibold text-purple-900 mb-2">🌐 Deploy to Vercel</h4>
                        <p class="text-sm text-purple-700">Click the "Deploy to Vercel" button above to see your live website in seconds</p>
                    </div>
                    
                    <div class="flex-1 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                        <h4 class="font-semibold text-blue-900 mb-2">💾 Download & Run Locally</h4>
                        <p class="text-sm text-blue-700">Download the ZIP file and run <code class="bg-blue-100 px-1 rounded">npm install</code> then <code class="bg-blue-100 px-1 rounded">npm run dev</code></p>
                    </div>
                </div>

                <div class="bg-gray-50 rounded-lg p-4 mt-4">
                    <h4 class="font-semibold text-gray-900 mb-2">✨ What's Included</h4>
                    <ul class="space-y-1 text-sm text-gray-700">
                        <li>✅ Modern, responsive design with Tailwind CSS</li>
                        <li>✅ Production-ready React/Next.js components</li>
                        <li>✅ Complete project configuration (package.json, tsconfig, etc.)</li>
                        <li>✅ Best practices and clean code architecture</li>
                        <li>✅ Ready for immediate deployment</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono overflow-hidden">
      {/* Animated Background - Match Landing Page */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Header */}
      <SiteHeader 
        title="AI WEBSITE BUILDER" 
        subtitle="PRODUCTION-READY. INSTANT DEPLOYMENT. REAL CODE." 
        variant="builder"
        showStatus={false}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="bg-gray-900/50 border border-purple-500/30 rounded-lg p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-purple-400 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              PRODUCTION-READY WEBSITE GENERATOR
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-purple-400 mb-2">WEBSITE DESCRIPTION:</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the website you want to build (e.g., 'A modern landing page for a SaaS project management tool with hero section, features, pricing, and testimonials')"
                  className="w-full h-32 bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-3 text-purple-100 placeholder-purple-500/50 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 resize-none"
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-purple-400 mb-2">TEMPLATE URL (OPTIONAL):</label>
                <input
                  type="url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://example.com/template-reference (optional)"
                  className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-3 text-purple-100 placeholder-purple-500/50 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50"
                  disabled={isProcessing}
                />
              </div>

              {/* AI Model Selection - Simplified for production */}
              <div className="bg-gray-800/30 border border-cyan-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-semibold text-cyan-400 mb-1">AI GENERATION MODE:</label>
                    <p className="text-xs text-cyan-500/70">
                      Using production-ready single-agent generation with Llama 4 Scout
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs bg-cyan-500/20 px-3 py-2 rounded-lg border border-cyan-500/30">
                    <Brain className="w-4 h-4 text-cyan-400" />
                    <span className="text-cyan-400 font-semibold">PRODUCTION MODE</span>
                  </div>
                </div>
              </div>

              {/* Component Registry Suggestions */}
              <div className="bg-gray-800/30 border border-cyan-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-cyan-400">COMPONENT LIBRARIES:</label>
                  <button
                    type="button"
                    onClick={() => setShowRegistries(!showRegistries)}
                    className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <Package className="w-4 h-4" />
                    <span>{showRegistries ? "HIDE REGISTRIES" : "SHOW AVAILABLE"}</span>
                  </button>
                </div>
                
                {showRegistries && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {AVAILABLE_REGISTRIES.slice(0, 4).map((registry) => (
                      <div key={registry.name} className="bg-gray-700/30 border border-cyan-500/20 rounded p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="w-3 h-3 text-cyan-400" />
                          <span className="text-xs font-semibold text-cyan-400">{registry.name}</span>
                        </div>
                        <p className="text-xs text-cyan-500/70 mb-2">{registry.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {registry.categories.slice(0, 3).map((category) => (
                            <span
                              key={category}
                              className="text-xs px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-cyan-500/70 mt-2">
                  AI will automatically suggest and use appropriate components from these libraries
                </p>
              </div>

              {/* Style Options Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowStyleOptions(!showStyleOptions)}
                  className="flex items-center gap-2 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Palette className="w-4 h-4" />
                  <span>CUSTOM STYLING OPTIONS</span>
                  <span className={`transform transition-transform ${showStyleOptions ? "rotate-180" : ""}`}>▼</span>
                </button>
              </div>

              {/* Style Options Panel */}
              {showStyleOptions && (
                <div className="bg-gray-800/50 border border-purple-500/20 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Color Scheme */}
                    <div>
                      <label className="block text-xs font-semibold text-purple-400 mb-2">COLOR SCHEME:</label>
                      <select
                        value={stylePreferences.colorScheme}
                        onChange={(e) =>
                          setStylePreferences({ ...stylePreferences, colorScheme: e.target.value as any })
                        }
                        className="w-full bg-gray-700/50 border border-purple-500/30 rounded px-3 py-2 text-purple-100 text-sm focus:outline-none focus:border-purple-400"
                      >
                        <option value="light">Light Theme</option>
                        <option value="dark">Dark Theme</option>
                        <option value="custom">Custom Colors</option>
                      </select>
                    </div>

                    {/* Layout Style */}
                    <div>
                      <label className="block text-xs font-semibold text-purple-400 mb-2">LAYOUT STYLE:</label>
                      <select
                        value={stylePreferences.layoutStyle}
                        onChange={(e) =>
                          setStylePreferences({ ...stylePreferences, layoutStyle: e.target.value as any })
                        }
                        className="w-full bg-gray-700/50 border border-purple-500/30 rounded px-3 py-2 text-purple-100 text-sm focus:outline-none focus:border-purple-400"
                      >
                        <option value="minimal">Minimal</option>
                        <option value="modern">Modern</option>
                        <option value="bold">Bold</option>
                        <option value="classic">Classic</option>
                      </select>
                    </div>

                    {/* Primary Color */}
                    <div>
                      <label className="block text-xs font-semibold text-purple-400 mb-2">PRIMARY COLOR:</label>
                      <input
                        type="text"
                        value={stylePreferences.primaryColor || ""}
                        onChange={(e) => setStylePreferences({ ...stylePreferences, primaryColor: e.target.value })}
                        placeholder="e.g., blue, #3B82F6"
                        className="w-full bg-gray-700/50 border border-purple-500/30 rounded px-3 py-2 text-purple-100 text-sm placeholder-purple-500/50 focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    {/* Secondary Color */}
                    <div>
                      <label className="block text-xs font-semibold text-purple-400 mb-2">ACCENT COLOR:</label>
                      <input
                        type="text"
                        value={stylePreferences.secondaryColor || ""}
                        onChange={(e) => setStylePreferences({ ...stylePreferences, secondaryColor: e.target.value })}
                        placeholder="e.g., purple, #8B5CF6"
                        className="w-full bg-gray-700/50 border border-purple-500/30 rounded px-3 py-2 text-purple-100 text-sm placeholder-purple-500/50 focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    {/* Typography */}
                    <div>
                      <label className="block text-xs font-semibold text-purple-400 mb-2">TYPOGRAPHY:</label>
                      <select
                        value={stylePreferences.typography}
                        onChange={(e) =>
                          setStylePreferences({ ...stylePreferences, typography: e.target.value as any })
                        }
                        className="w-full bg-gray-700/50 border border-purple-500/30 rounded px-3 py-2 text-purple-100 text-sm focus:outline-none focus:border-purple-400"
                      >
                        <option value="sans-serif">Sans-serif (Modern)</option>
                        <option value="serif">Serif (Traditional)</option>
                        <option value="monospace">Monospace (Technical)</option>
                      </select>
                    </div>

                    {/* Border Radius */}
                    <div>
                      <label className="block text-xs font-semibold text-purple-400 mb-2">BORDER RADIUS:</label>
                      <select
                        value={stylePreferences.borderRadius}
                        onChange={(e) =>
                          setStylePreferences({ ...stylePreferences, borderRadius: e.target.value as any })
                        }
                        className="w-full bg-gray-700/50 border border-purple-500/30 rounded px-3 py-2 text-purple-100 text-sm focus:outline-none focus:border-purple-400"
                      >
                        <option value="none">Sharp Corners</option>
                        <option value="small">Small Rounded</option>
                        <option value="medium">Medium Rounded</option>
                        <option value="large">Large Rounded</option>
                      </select>
                    </div>
                  </div>

                  {/* Animations Toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="animations"
                      checked={stylePreferences.animations}
                      onChange={(e) => setStylePreferences({ ...stylePreferences, animations: e.target.checked })}
                      className="w-4 h-4 text-purple-400 bg-gray-700 border-purple-500 rounded focus:ring-purple-400"
                    />
                    <label htmlFor="animations" className="text-xs font-semibold text-purple-400">
                      Include animations and transitions
                    </label>
                  </div>

                  {/* Custom Instructions */}
                  <div>
                    <label className="block text-xs font-semibold text-purple-400 mb-2">
                      CUSTOM STYLE INSTRUCTIONS:
                    </label>
                    <textarea
                      value={stylePreferences.customInstructions || ""}
                      onChange={(e) => setStylePreferences({ ...stylePreferences, customInstructions: e.target.value })}
                      placeholder="Additional styling requirements (e.g., 'Use glassmorphism effects', 'Add subtle shadows')"
                      className="w-full h-20 bg-gray-700/50 border border-purple-500/30 rounded px-3 py-2 text-purple-100 text-sm placeholder-purple-500/50 resize-none focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-6">
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
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-8 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-purple-500/25"
              >
                <Send className="w-4 h-4" />
                <span>GENERATE WEBSITE</span>
              </button>
            </div>
          </div>
        </form>

        {/* Results */}
        {pipelineResult && (
          <div className="space-y-6">
            {/* Pipeline Summary */}
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  GENERATION RESULTS
                </h3>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-purple-500/70">Request ID: {pipelineResult.requestId}</span>
                  <span className={`font-semibold ${getStatusColor(pipelineResult.status)}`}>
                    {pipelineResult.status}
                  </span>
                  <span className="text-purple-500/70">{pipelineResult.totalTime}ms</span>
                  <button
                    onClick={() => setShowPredictivePanel(!showPredictivePanel)}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      showPredictivePanel
                        ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/50"
                        : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30"
                    }`}
                  >
                    <Brain className="w-3 h-3" />
                    AI INSIGHTS
                  </button>
                </div>
              </div>

              {/* Deployment Status */}
              {pipelineResult.deploymentUrl && (
                <div className="mb-4 bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    LIVE DEPLOYMENT
                  </h4>
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-purple-400">Website URL:</span>{" "}
                      <a
                        href={pipelineResult.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 underline"
                      >
                        {pipelineResult.deploymentUrl}
                      </a>
                    </div>
                    {pipelineResult.githubRepo && (
                      <div>
                        <span className="text-purple-400">GitHub Repo:</span>{" "}
                        <a
                          href={pipelineResult.githubRepo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 underline"
                        >
                          {pipelineResult.githubRepo}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

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

              {/* Generated Files */}
              {pipelineResult.codeFiles && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-purple-400">GENERATED FILES:</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        disabled={previewLocked || !pipelineResult.codeFiles}
                        className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 hover:border-purple-400 text-purple-400 px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Globe className="w-4 h-4" />
                        <span>{showPreview ? "HIDE PREVIEW" : "LIVE PREVIEW"}</span>
                      </button>
                      <button
                        onClick={handleDeploy}
                        disabled={isDeploying || !!pipelineResult.deploymentUrl}
                        className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-cyan-500/25"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{pipelineResult.deploymentUrl ? "DEPLOYED" : "DEPLOY TO VERCEL"}</span>
                      </button>
                      <button
                        onClick={downloadZip}
                        className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 hover:border-purple-400 text-purple-400 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>DOWNLOAD ZIP</span>
                      </button>
                    </div>
                  </div>

                  {/* Live Preview Section */}
                  {showPreview && pipelineResult.codeFiles && (
                    <div className="mb-4 bg-gray-800/50 border border-cyan-500/20 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          LIVE PREVIEW
                        </h5>
                        {previewLocked && (
                          <div className="flex items-center gap-2 text-xs text-purple-400">
                            <Clock className="w-3 h-3 animate-spin" />
                            <span>Agents working...</span>
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-900/50 border border-cyan-500/30 rounded-lg overflow-hidden">
                        {previewLocked ? (
                          <div className="h-96 flex items-center justify-center text-purple-400">
                            <div className="text-center">
                              <Clock className="w-8 h-8 mx-auto mb-2 animate-spin" />
                              <p>Preview locked while agents are working...</p>
                            </div>
                          </div>
                        ) : (
                          <iframe
                            title="Live Preview"
                            src={`data:text/html;charset=utf-8,${encodeURIComponent(getPreviewHTML())}`}
                            className="w-full h-96 border-0"
                            sandbox="allow-scripts allow-same-origin"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* File List */}
                    <div className="bg-gray-800/50 border border-purple-500/20 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-purple-400 mb-3">FILE STRUCTURE</h5>
                      <div className="space-y-2">
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

                    {/* File Content */}
                    <div className="lg:col-span-2 bg-gray-800/50 border border-purple-500/20 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-purple-400 mb-3">
                        {selectedFile ? selectedFile : "Select a file to view content"}
                      </h5>
                      {selectedFile && pipelineResult.codeFiles[selectedFile] && (
                        <pre className="text-xs text-purple-200 bg-gray-900/50 p-3 rounded overflow-auto max-h-96 whitespace-pre-wrap">
                          {pipelineResult.codeFiles[selectedFile]}
                        </pre>
                      )}
                      {!selectedFile && (
                        <div className="text-center py-8 text-purple-500/50">
                          <FileText className="w-8 h-8 mx-auto mb-2" />
                          <p>Click on a file to view its content</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Predictive Insights Panel */}
            {showPredictivePanel && pipelineResult.codeFiles && (
              <PredictiveInsightsPanel
                codeFiles={pipelineResult.codeFiles}
                projectType="nextjs"
                userId="demo-user"
                onApplyFix={handleApplyFix}
              />
            )}
          </div>
        )}
      </div>

      {/* Hidden Admin Panel */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900/95 border border-red-500/30 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                ADMIN CONTROL PANEL
              </h3>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="text-gray-400 hover:text-red-400 transition-colors"
              >
                <EyeOff className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* AI Model Configuration */}
              <div className="bg-gray-800/50 border border-red-500/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  AI MODEL CONFIGURATION
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-red-400 mb-2">PRIMARY MODEL:</label>
                    <select
                      value={adminSettings.primaryModel}
                      onChange={(e) => setAdminSettings({...adminSettings, primaryModel: e.target.value})}
                      className="w-full bg-gray-700/50 border border-red-500/30 rounded px-3 py-2 text-red-100 text-sm focus:outline-none focus:border-red-400"
                    >
                      <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                      <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                      <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
                      <option value="gpt-4o">GPT-4o</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-red-400 mb-2">SECONDARY MODEL:</label>
                    <select
                      value={adminSettings.secondaryModel}
                      onChange={(e) => setAdminSettings({...adminSettings, secondaryModel: e.target.value})}
                      className="w-full bg-gray-700/50 border border-red-500/30 rounded px-3 py-2 text-red-100 text-sm focus:outline-none focus:border-red-400"
                    >
                      <option value="meta-llama/llama-3.1-70b-versatile">Llama 3.1 70B</option>
                      <option value="meta-llama/llama-3.1-8b-instant">Llama 3.1 8B</option>
                      <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                      <option value="gemma-7b-it">Gemma 7B</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Generation Settings */}
              <div className="bg-gray-800/50 border border-red-500/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  GENERATION SETTINGS
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-red-400 mb-2">MAX TOKENS:</label>
                    <input
                      type="number"
                      value={adminSettings.maxTokens}
                      onChange={(e) => setAdminSettings({...adminSettings, maxTokens: parseInt(e.target.value)})}
                      className="w-full bg-gray-700/50 border border-red-500/30 rounded px-3 py-2 text-red-100 text-sm focus:outline-none focus:border-red-400"
                      min="1000"
                      max="8000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-red-400 mb-2">TEMPERATURE:</label>
                    <input
                      type="number"
                      value={adminSettings.temperature}
                      onChange={(e) => setAdminSettings({...adminSettings, temperature: parseFloat(e.target.value)})}
                      className="w-full bg-gray-700/50 border border-red-500/30 rounded px-3 py-2 text-red-100 text-sm focus:outline-none focus:border-red-400"
                      min="0"
                      max="2"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="bg-gray-800/50 border border-red-500/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  FEATURE TOGGLES
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-red-400">Real-time Search</span>
                    <input
                      type="checkbox"
                      checked={adminSettings.enableRealTimeSearch}
                      onChange={(e) => setAdminSettings({...adminSettings, enableRealTimeSearch: e.target.checked})}
                      className="w-4 h-4 text-red-400 bg-gray-700 border-red-500 rounded focus:ring-red-400"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-red-400">Component Registries</span>
                    <input
                      type="checkbox"
                      checked={adminSettings.enableRegistries}
                      onChange={(e) => setAdminSettings({...adminSettings, enableRegistries: e.target.checked})}
                      className="w-4 h-4 text-red-400 bg-gray-700 border-red-500 rounded focus:ring-red-400"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    // Here you would save the settings to localStorage or API
                    localStorage.setItem('adminSettings', JSON.stringify(adminSettings))
                    setShowAdminPanel(false)
                  }}
                  className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-red-500/25"
                >
                  <Settings className="w-4 h-4" />
                  <span>SAVE SETTINGS</span>
                </button>
              </div>

              <div className="text-xs text-red-500/70 text-center">
                Access: Ctrl+Shift+A+D+M | Settings saved locally | Use responsibly
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
