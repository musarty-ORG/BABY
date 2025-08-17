"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Check, Zap, ArrowRight, Sparkles, Star, Crown, Rocket, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

function PricingContent() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [userSession, setUserSession] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'warning', message: string} | null>(null)
  const searchParams = useSearchParams()

  // Add useEffect to check for user session and handle success/error params
  useEffect(() => {
    // Handle success/error parameters from PayPal redirects
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const messages = searchParams.get('messages')
    const authRequired = searchParams.get('auth_required')
    
    if (success) {
      let message = ''
      switch(success) {
        case 'subscription_activated':
          message = 'Subscription activated successfully! Welcome to Code Homie.'
          break
        case 'topup_completed':
          message = `Top-up completed! ${messages || 'Credits'} added to your account.`
          break
        default:
          message = 'Payment completed successfully!'
      }
      setNotification({ type: 'success', message })
    } else if (error) {
      let message = 'Payment failed. Please try again.'
      switch(error) {
        case 'payment_failed':
          message = 'Payment failed. Please check your payment method and try again.'
          break
        case 'processing_failed':
          message = 'Payment processing failed. Please contact support if this continues.'
          break
        default:
          message = 'Payment failed. Please try again.'
      }
      setNotification({ type: 'error', message })
    } else if (authRequired) {
      setNotification({ type: 'warning', message: 'Please sign in to continue with your purchase.' })
    }

    // Auto-hide notification after 10 seconds
    if (success || error || authRequired) {
      const timer = setTimeout(() => {
        setNotification(null)
        // Clean up URL params
        window.history.replaceState({}, '', '/pricing')
      }, 10000)
      return () => clearTimeout(timer)
    }

    const sessionToken = localStorage.getItem("session_token")
    if (sessionToken) {
      // Fetch user info
      fetch("/api/user/dashboard", {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUserSession(data.data.user)
          }
        })
        .catch(console.error)
    }
  }, [searchParams])

  // Add subscription handler
  const handleSubscription = async (plan: string) => {
    // Check if user is authenticated
    if (!userSession) {
      setNotification({ type: 'warning', message: 'Please sign in to continue with your subscription.' })
      return
    }
    
    // Redirect to checkout page
    window.location.href = `/checkout?plan=${plan}`
  }

  // Add top-up handler
  const handleTopUp = async (messages: number) => {
    if (!userSession) {
      alert("Please log in first")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          userEmail: userSession.email,
          userId: userSession.id,
        }),
      })

      const data = await response.json()

      if (data.success && data.approval_url) {
        // Redirect to PayPal for approval
        window.location.href = data.approval_url
      } else {
        alert("Failed to create order: " + data.error)
      }
    } catch (error) {
      console.error("Top-up error:", error)
      alert("Failed to create order")
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

      {/* Success/Error Notification */}
      {notification && (
        <div className="relative z-20 max-w-4xl mx-auto px-4 pt-6">
          <div className={`p-4 rounded-lg border backdrop-blur-sm ${
            notification.type === 'success' 
              ? 'bg-green-500/10 border-green-500/30 text-green-300' 
              : notification.type === 'warning'
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : notification.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span>{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="ml-auto text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div
              id="basic-homie"
              className="bg-gray-900/50 border border-purple-500/30 rounded-2xl overflow-hidden transition-all hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10 scroll-mt-24"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-6 h-6 text-purple-400" />
                    <h3 className="text-2xl font-bold text-purple-400">Basic Homie</h3>
                  </div>
                  <div className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs font-semibold">
                    STARTER
                  </div>
                </div>
                <div className="mb-6">
                  <div className="text-4xl font-bold text-white mb-2">
                    $3<span className="text-lg">/month</span>
                  </div>
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
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Community support</span>
                  </div>
                </div>
                <button
                  onClick={() => handleSubscription("basic")}
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="mt-4 text-center">
                  <p className="text-xs text-purple-300/70">Product: basic_homie</p>
                </div>
              </div>
            </div>

            {/* Builder Homie */}
            <div
              id="builder-homie"
              className="bg-gray-900/50 border border-green-500/30 rounded-2xl overflow-hidden relative transition-all hover:border-green-400/50 hover:shadow-lg hover:shadow-green-500/10 transform scale-105 scroll-mt-24"
            >
              <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-green-600 to-cyan-600 text-center py-1 text-xs font-bold text-white">
                MOST POPULAR
              </div>
              <div className="p-8 pt-12">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Rocket className="w-6 h-6 text-green-400" />
                    <h3 className="text-2xl font-bold text-green-400">Builder Homie</h3>
                  </div>
                  <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                    RECOMMENDED
                  </div>
                </div>
                <div className="mb-6">
                  <div className="text-4xl font-bold text-white mb-2">
                    $6<span className="text-lg">/month</span>
                  </div>
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
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Multi-agent workflows</span>
                  </div>
                </div>
                <button
                  onClick={() => handleSubscription("builder")}
                  className="w-full bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="mt-4 text-center">
                  <p className="text-xs text-green-300/70">Product: builder_homie</p>
                </div>
              </div>
            </div>

            {/* Architect Homie */}
            <div
              id="architect-homie"
              className="bg-gray-900/50 border border-blue-500/30 rounded-2xl overflow-hidden transition-all hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10 scroll-mt-24"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Crown className="w-6 h-6 text-blue-400" />
                    <h3 className="text-2xl font-bold text-blue-400">Architect Homie</h3>
                  </div>
                  <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold">
                    PROFESSIONAL
                  </div>
                </div>
                <div className="mb-6">
                  <div className="text-4xl font-bold text-white mb-2">
                    $9<span className="text-lg">/month</span>
                  </div>
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
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Custom integrations</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Dedicated support</span>
                  </div>
                </div>
                <button
                  onClick={() => handleSubscription("architect")}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="mt-4 text-center">
                  <p className="text-xs text-blue-300/70">Product: architect_homie</p>
                </div>
              </div>
            </div>
          </div>

          {/* Plan Comparison Section */}
          <div className="bg-gray-900/50 border border-purple-500/30 rounded-2xl p-8 mb-16">
            <h2 className="text-2xl font-bold text-purple-400 mb-8 text-center">Plan Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-purple-500/30">
                    <th className="text-left py-4 text-purple-400">Feature</th>
                    <th className="text-center py-4 text-purple-400">Basic Homie</th>
                    <th className="text-center py-4 text-green-400">Builder Homie</th>
                    <th className="text-center py-4 text-blue-400">Architect Homie</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-gray-700/50">
                    <td className="py-4">Monthly Messages</td>
                    <td className="text-center py-4">3</td>
                    <td className="text-center py-4">10</td>
                    <td className="text-center py-4">25</td>
                  </tr>
                  <tr className="border-b border-gray-700/50">
                    <td className="py-4">Extra Message Cost</td>
                    <td className="text-center py-4">$1.00</td>
                    <td className="text-center py-4">$0.90</td>
                    <td className="text-center py-4">$0.80</td>
                  </tr>
                  <tr className="border-b border-gray-700/50">
                    <td className="py-4">Code Generation</td>
                    <td className="text-center py-4">Basic</td>
                    <td className="text-center py-4">Advanced</td>
                    <td className="text-center py-4">Premium</td>
                  </tr>
                  <tr className="border-b border-gray-700/50">
                    <td className="py-4">Support Level</td>
                    <td className="text-center py-4">Community</td>
                    <td className="text-center py-4">Priority</td>
                    <td className="text-center py-4">Dedicated</td>
                  </tr>
                  <tr className="border-b border-gray-700/50">
                    <td className="py-4">Multi-Agent Workflows</td>
                    <td className="text-center py-4">❌</td>
                    <td className="text-center py-4">✅</td>
                    <td className="text-center py-4">✅</td>
                  </tr>
                  <tr>
                    <td className="py-4">Custom Integrations</td>
                    <td className="text-center py-4">❌</td>
                    <td className="text-center py-4">❌</td>
                    <td className="text-center py-4">✅</td>
                  </tr>
                </tbody>
              </table>
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
                    <span className="text-gray-300">If bucket is empty, you'll be prompted to top-up or upgrade</span>
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
                <button
                  onClick={() => handleTopUp(1)}
                  disabled={loading}
                  className="w-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-400 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Buy Now"}
                </button>
              </div>
              <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-6 text-center transition-all hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10">
                <h3 className="text-lg font-semibold text-purple-400 mb-2">5 Messages</h3>
                <div className="text-2xl font-bold text-white mb-4">$4.50</div>
                <div className="text-xs text-green-400 mb-4">Save 10%</div>
                <button
                  onClick={() => handleTopUp(5)}
                  disabled={loading}
                  className="w-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-400 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Buy Now"}
                </button>
              </div>
              <div className="bg-gray-900/50 border border-green-500/30 rounded-xl p-6 text-center transition-all hover:border-green-400/50 hover:shadow-lg hover:shadow-green-500/10">
                <h3 className="text-lg font-semibold text-green-400 mb-2">10 Messages</h3>
                <div className="text-2xl font-bold text-white mb-4">$9</div>
                <div className="text-xs text-green-400 mb-4">Save 10%</div>
                <button
                  onClick={() => handleTopUp(10)}
                  disabled={loading}
                  className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Best Value"}
                </button>
              </div>
              <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-6 text-center transition-all hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10">
                <h3 className="text-lg font-semibold text-purple-400 mb-2">25 Messages</h3>
                <div className="text-2xl font-bold text-white mb-4">$20</div>
                <div className="text-xs text-green-400 mb-4">Save 20%</div>
                <button
                  onClick={() => handleTopUp(25)}
                  disabled={loading}
                  className="w-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-400 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Buy Now"}
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
                  Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access
                  to the new plan's benefits. When downgrading, the change will take effect on your next billing cycle.
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
              Code Homie | Professional AI Coding Assistant
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-300">Loading pricing...</p>
        </div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
}
