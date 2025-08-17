"use client"

// import { useChat } from "ai/react"
// Temporary fix - using manual state management instead of useChat
import { useState, useRef, useEffect } from "react"
import { Send, Terminal, Zap, Code, Shield, Brain, ArrowRight, Sparkles, Cpu, Globe, Rocket } from 'lucide-react'
import Link from "next/link"

export default function CodeHomieHome() {
  const [selectedModel, setSelectedModel] = useState<"scout" | "maverick">("scout")
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    // Redirect to the actual multi-agent interface
    window.location.href = '/multi-agent'
  }
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

  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn("Unhandled promise rejection:", event.reason)
      event.preventDefault() // Prevent the error from crashing the app
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  return (
    <div className="min-h-screen bg-black text-white font-mono overflow-hidden">
      {/* Animated Background */}
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
      <header className="relative z-10 border-b border-purple-500/30 bg-black/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hndkjn-12r7gakfDUd4Wz8G5F2UxDVU7EKkCj.png"
                alt="Code Homie Logo"
                className="w-12 h-12 rounded-lg"
              />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  CODE HOMIE
                </h1>
                <p className="text-xs text-purple-300/70">HACK. STACK. HUSTLE.</p>
              </div>
            </div>

            <nav className="flex items-center gap-6">
              <Link href="/" className="text-purple-400 font-semibold border-b-2 border-purple-400 pb-1">
                Home
              </Link>
              <Link href="/multi-agent" className="text-gray-400 hover:text-purple-400 transition-colors font-semibold">
                CODE HOMIE
              </Link>
              <Link href="/pricing" className="text-gray-400 hover:text-purple-400 transition-colors font-semibold">
                Pricing
              </Link>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400">ONLINE</span>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Section */}
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/40 rounded-full px-4 py-2 text-sm">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-300">Powered by GPT-4O | Llama DeepSeek | Scout</span>
                </div>

                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                    CODE
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    HOMIE
                  </span>
                </h1>

                <p className="text-xl lg:text-2xl text-gray-300 leading-relaxed">
                  Your legendary AI coding companion.
                  <span className="text-purple-400 font-semibold"> Hack</span> the impossible,
                  <span className="text-cyan-400 font-semibold"> Stack</span> the future,
                  <span className="text-pink-400 font-semibold"> Hustle</span> with AI.
                </p>

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-2">
                    <Code className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-gray-300">Multi-Language Support</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg px-4 py-2">
                    <Brain className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm text-gray-300">AI-Powered Insights</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-800/50 border border-pink-500/30 rounded-lg px-4 py-2">
                    <Rocket className="w-5 h-5 text-pink-400" />
                    <span className="text-sm text-gray-300">Real-time Assistance</span>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/multi-agent"
                  className="group bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
                >
                  <Cpu className="w-5 h-5" />
                  <span>Launch CODE HOMIE</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <button className="bg-gray-800/50 hover:bg-gray-700/50 border border-purple-500/30 hover:border-purple-400 text-purple-300 px-8 py-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2">
                  <Globe className="w-5 h-5" />
                  <span>Explore Features</span>
                </button>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden border border-purple-500/30 shadow-2xl shadow-purple-500/20">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/code%20homie%20hero.png-bOx9uZDjzOMYW5PvbqSsWIEfIaOxFM.jpeg"
                  alt="Code Homie Workspace"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-purple-500/20 border border-purple-500/40 rounded-lg p-3 backdrop-blur-sm">
                <Terminal className="w-6 h-6 text-purple-400" />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-cyan-500/20 border border-cyan-500/40 rounded-lg p-3 backdrop-blur-sm">
                <Zap className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="mt-16">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gray-900/50 border border-purple-500/30 rounded-2xl backdrop-blur-sm shadow-2xl shadow-purple-500/10">
                {/* Chat Header */}
                <div className="border-b border-purple-500/30 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-6 h-6 text-purple-400" />
                        <span className="text-xl font-bold text-purple-400">AI CHAT TERMINAL</span>
                      </div>

                      {/* Model Toggle */}
                      <div className="flex items-center gap-2 ml-6">
                        <span className="text-xs text-purple-500/70">MODEL:</span>
                        <div className="flex items-center bg-gray-800/50 border border-purple-500/30 rounded-lg p-1">
                          <button
                            onClick={() => setSelectedModel("scout")}
                            className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                              selectedModel === "scout"
                                ? "bg-purple-500/30 text-purple-300 border border-purple-500/50"
                                : "text-purple-500/70 hover:text-purple-400"
                            }`}
                          >
                            SCOUT
                          </button>
                          <button
                            onClick={() => setSelectedModel("maverick")}
                            className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                              selectedModel === "maverick"
                                ? "bg-purple-500/30 text-purple-300 border border-purple-500/50"
                                : "text-purple-500/70 hover:text-purple-400"
                            }`}
                          >
                            MAVERICK
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-xs text-purple-500/70">
                        <Shield className="w-3 h-3" />
                        <span>SECURE</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-green-500/70">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span>CONNECTED</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="h-[50vh] overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <Brain className="w-16 h-16 text-purple-500/50 mx-auto mb-4" />
                      <h2 className="text-xl font-semibold text-purple-400 mb-2">Code Homie AI Ready</h2>
                      <p className="text-purple-500/70 text-sm mb-6">
                        Your legendary coding companion is online. Ask anything about programming, get code examples, or
                        discuss tech.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                        <div className="bg-gray-800/30 border border-purple-500/20 rounded-lg p-3 text-left">
                          <p className="text-sm text-purple-300 font-semibold mb-1">💡 Get Code Examples</p>
                          <p className="text-xs text-gray-400">"Show me a React component for a login form"</p>
                        </div>
                        <div className="bg-gray-800/30 border border-cyan-500/20 rounded-lg p-3 text-left">
                          <p className="text-sm text-cyan-300 font-semibold mb-1">🚀 Debug Issues</p>
                          <p className="text-xs text-gray-400">"Help me fix this JavaScript error"</p>
                        </div>
                        <div className="bg-gray-800/30 border border-pink-500/20 rounded-lg p-3 text-left">
                          <p className="text-sm text-pink-300 font-semibold mb-1">🎯 Learn Concepts</p>
                          <p className="text-xs text-gray-400">"Explain async/await in simple terms"</p>
                        </div>
                        <div className="bg-gray-800/30 border border-green-500/20 rounded-lg p-3 text-left">
                          <p className="text-sm text-green-300 font-semibold mb-1">⚡ Optimize Code</p>
                          <p className="text-xs text-gray-400">"How can I make this function faster?"</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-lg ${
                          message.role === "user"
                            ? "bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/40 text-purple-100"
                            : "bg-gray-800/50 border border-purple-500/20 text-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-purple-400">
                            {message.role === "user" ? "[USER]" : "[CODE HOMIE]"}
                          </span>
                          <span className="text-xs text-purple-500/50">{new Date().toLocaleTimeString()}</span>
                        </div>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-800/50 border border-purple-500/20 text-gray-100 max-w-[80%] p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-purple-400">[CODE HOMIE]</span>
                          <span className="text-xs text-purple-500/50">{new Date().toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Thinking</span>
                          <div className="flex gap-1">
                            <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse"></div>
                            <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-100"></div>
                            <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-200"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Form */}
                <div className="border-t border-purple-500/30 p-6">
                  <form onSubmit={handleSubmit} className="flex gap-3">
                    <div className="flex-1 relative">
                      <input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Ask Code Homie anything about programming..."
                        className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-3 text-purple-100 placeholder-purple-500/50 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50"
                        disabled={isLoading}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Zap className="w-4 h-4 text-purple-500/50" />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-6 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-purple-500/25"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">SEND</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-purple-500/30 bg-black/90 backdrop-blur-sm mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-purple-500/70 text-sm">
              Code Homie v2.1 | Powered by Llama 4 Scout & Maverick | Secure Neural Network
            </p>
            <p className="text-purple-500/50 text-xs mt-2">
              HACK. STACK. HUSTLE. | Your Legendary AI Coding Companion |{" "}
              <Link href="/admin" className="text-purple-500/50 hover:text-purple-500/70">
                Danger
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
