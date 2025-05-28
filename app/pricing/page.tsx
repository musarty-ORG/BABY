"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Zap, Shield, Brain, ArrowRight, Sparkles, Globe, Rocket } from 'lucide-react'

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

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
              <Link href="/" className="text-gray-400 hover:text-purple-400 transition-colors font-semibold">
                Home
              </Link>
              <Link href="/multi-agent" className="text-gray-400 hover:text-purple-400 transition-colors font-semibold">
                CODE HOMIE
              </Link>
              <Link href="/pricing" className="text-purple-400 font-semibold border-b-2 border-purple-400 pb-1">
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
        <div className="max-w-7xl mx-auto px-4 py-16">
          {/* Pricing Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/40 rounded-full px-4 py-2 text-sm mb-6">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300">Token-Based Pricing</span>
            </div>
            <h1 className="text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                The Money Blueprint
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Choose the perfect plan for your coding journey with our token-based metering system.
              <span className="text-purple-400"> Pay only for what you use.</span>
            </p>
          </div>

          {/* Pricing Table */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Basic Homie */}
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-2xl overflow-hidden transition-all hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10">
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-purple-400">Basic Homie</h3>
                  <div className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs font-semibold">
                    STARTER
                  </div>
                </div>
                <div className="mb-6">
                  <div className="text-4xl font-bold text-white mb-2">$3<span className="text-lg">/month</span></div>
                  <p className="text-gray-400 text-sm">Perfect for hobby projects and testing</p>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">3 free token-messages</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">$1 per extra message</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Follow-up questions are free</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Basic code generation</span>
                  </div>
                </div>
                <button className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2">
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Builder Homie */}
            <div className="bg-gray-900/50 border border-green-500/30 rounded-2xl overflow-hidden relative transition-all hover:border-green-400/50 hover:shadow-lg hover:shadow-green-500/10 transform scale-105">
              <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-green-600 to-cyan-600 text-center py-1 text-xs font-bold text-white">
                MOST POPULAR
              </div>
              <div className="p-8 pt-12">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-green-400">Builder Homie</h3>
                  <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                    RECOMMENDED
                  </div>
                </div>
                <div className="mb-6">
                  <div className="text-4xl font-bold text-white mb-2">$6<span className="text-lg">/month</span></div>
                  <p className="text-gray-400 text-sm">Ideal for small to medium projects</p>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">10 free token-messages</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">$0.90 per extra message</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Follow-up questions are free</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Advanced code generation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Priority support</span>
                  </div>
                </div>
                <button className="w-full bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2">
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Architect Homie */}
            <div className="bg-gray-900/50 border border-blue-500/30 rounded-2xl overflow-hidden transition-all hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10">
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-blue-400">Architect Homie</h3>
                  <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold">
                    PROFESSIONAL
                  </div>
                </div>
                <div className="mb-6">
                  <div className="text-4xl font-bold text-white mb-2">$9<span className="text-lg">/month</span></div>
                  <p className="text-gray-400 text-sm">For heavy users and complex projects</p>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">25 free token-messages</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">$0.80 per extra message</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Follow-up questions are free</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Premium code generation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Priority support</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Advanced AI features</span>
                  </div>
                </div>
                <button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2">
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Token Metering Explanation */}
          <div className="bg-gray-900/50 border border-purple-500/30 rounded-2xl p-8 mb-16">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">How Token Metering Works</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-4">Token Calculation</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="mt-1 min-w-5">
                      <Zap className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-gray-300">1 message = up to 1,000 tokens generated for your request</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 min-w-5">
                      <Zap className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-gray-300">
                      Token usage is rounded up: ceil(tokens / 1000) = messages deducted
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 min-w-5">
                      <Zap className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-gray-300">Follow-up questions from Code Homie don't cost tokens</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-4">Billing Rules</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="mt-1 min-w-5">
                      <Zap className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-gray-300">Monthly bucket resets on renewal date</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 min-w-5">
                      <Zap className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-gray-300">Top-ups never expire and are used before monthly bucket</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 min-w-5">
                      <Zap className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-gray-300">
                      If bucket is empty, you'll be prompted to top-up or upgrade
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Top-Up Options */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-purple-400 mb-8 text-center">Top-Up Options</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-6 text-center transition-all hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10">
                <h3 className="text-lg font-semibold text-purple-400 mb-2">1 Message</h3>
                <div className="text-2xl font-bold text-white mb-4">$1</div>
                <button className="w-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-400 px-4 py-2 rounded-lg transition-all">
                  Buy Now
                </button>
              </div>
              <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-6 text-center transition-all hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10">
                <h3 className="text-lg font-semibold text-purple-400 mb-2">5 Messages</h3>
                <div className="text-2xl font-bold text-white mb-4">$4.50</div>
                <div className="text-xs text-green-400 mb-4">Save 10%</div>
                <button className="w-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-400 px-4 py-2 rounded-lg transition-all">
                  Buy Now
                </button>
              </div>
              <div className="bg-gray-900/50 border border-green-500/30 rounded-xl p-6 text-center transition-all hover:border-green-400/50 hover:shadow-lg hover:shadow-green-500/10">
                <h3 className="text-lg font-semibold text-green-400 mb-2">10 Messages</h3>
                <div className="text-2xl font-bold text-white mb-4">$9</div>
                <div className="text-xs text-green-400 mb-4">Save 10%</div>
                <button className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 px-4 py-2 rounded-lg transition-all">
                  Best Value
                </button>
              </div>
              <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-6 text-center transition-all hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10">
                <h3 className="text-lg font-semibold text-purple-400 mb-2">25 Messages</h3>
                <div className="text-2xl font-bold text-white mb-4">$20</div>
                <div className="text-xs text-green-400 mb-4">Save 20%</div>
                <button className="w-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-400 px-4 py-2 rounded-lg transition-all">
                  Buy Now
                </button>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-gray-900/50 border border-purple-500/30 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-purple-400 mb-8">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-3">What is a token-message?</h3>
                <p className="text-gray-300">
                  A token-message represents up to 1,000 tokens generated in response to your request. Tokens are the
                  basic units that AI models process, roughly equivalent to 4 characters or 0.75 words.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-3">Do unused messages roll over?</h3>
                <p className="text-gray-300">
                  No, your monthly message allocation resets when your subscription renews. However, any top-up messages
                  you purchase never expire and will be used before your monthly allocation.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-3">Can I change plans?</h3>
                <p className="text-gray-300">
                  Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to
                  the new plan's benefits. When downgrading, the change will take effect on your next billing cycle.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-3">How do follow-up questions work?</h3>
                <p className="text-gray-300">
                  Follow-up questions that Code Homie asks you to clarify your request don't count against your token
                  usage. Only the tokens generated in response to your requests are counted.
                </p>
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
