"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Download, ArrowRight, Zap, Star } from "lucide-react"

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const [receipt, setReceipt] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const subscriptionId = searchParams.get("subscription_id")
    const token = searchParams.get("token")

    if (subscriptionId || token) {
      // Fetch receipt details
      fetchReceiptDetails(subscriptionId, token)
    } else {
      setLoading(false)
    }
  }, [searchParams])

  const fetchReceiptDetails = async (subscriptionId: string | null, token: string | null) => {
    try {
      const response = await fetch("/api/paypal/subscription/success", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_id: subscriptionId, token }),
      })

      const data = await response.json()
      if (data.success) {
        setReceipt(data.receipt)
      }
    } catch (error) {
      console.error("Error fetching receipt:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        <div className="max-w-4xl mx-auto px-4 py-16">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-400 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-green-400 mb-2">Processing Your Subscription</h2>
              <p className="text-gray-300">Please wait while we set up your account...</p>
            </div>
          ) : (
            <div className="text-center">
              {/* Success Icon */}
              <div className="mb-8">
                <CheckCircle className="w-24 h-24 text-green-400 mx-auto mb-4" />
                <h1 className="text-4xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-green-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    Payment Successful!
                  </span>
                </h1>
                <p className="text-xl text-gray-300">Welcome to Code Homie! Your subscription is now active.</p>
              </div>

              {/* Receipt */}
              {receipt && (
                <div className="bg-gray-900/50 border border-green-500/30 rounded-2xl p-8 mb-8 max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold text-green-400 mb-6">Receipt</h2>
                  <div className="space-y-4 text-left">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Plan:</span>
                      <span className="text-white font-semibold">{receipt.plan_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Amount:</span>
                      <span className="text-white font-semibold">${receipt.amount}/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Messages Included:</span>
                      <span className="text-white font-semibold">{receipt.messages} messages</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Subscription ID:</span>
                      <span className="text-white font-mono text-sm">{receipt.subscription_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Next Billing:</span>
                      <span className="text-white">{receipt.next_billing_date}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Link
                  href="/multi-agent"
                  className="bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  <span>Start Building</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => window.print()}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Receipt</span>
                </button>
              </div>

              {/* What's Next */}
              <div className="bg-gray-900/50 border border-purple-500/30 rounded-2xl p-8 max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold text-purple-400 mb-6">What's Next?</h3>
                <div className="space-y-4 text-left">
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-yellow-400 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-white">Start Coding</h4>
                      <p className="text-gray-300 text-sm">
                        Head to the Code Homie builder and start generating amazing code with AI
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-white">Track Usage</h4>
                      <p className="text-gray-300 text-sm">
                        Monitor your token usage and remaining messages in your dashboard
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-white">Get Support</h4>
                      <p className="text-gray-300 text-sm">
                        Need help? Our support team is ready to assist you with any questions
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-purple-500/30 bg-black/90 backdrop-blur-sm mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-purple-500/70 text-sm">
              Code Homie v2.1 | Powered by Llama 4 Scout & Maverick | Secure Neural Network
            </p>
            <p className="text-purple-500/50 text-xs mt-2">HACK. STACK. HUSTLE. | Your Legendary AI Coding Companion</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
