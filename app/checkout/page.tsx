"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Check,
  ArrowLeft,
  CreditCard,
  Shield,
  Zap,
  Clock,
  Star,
  Rocket,
  Crown,
  Trash2,
  Apple,
  Smartphone,
  Wallet,
} from "lucide-react"

interface PlanDetails {
  id: string
  name: string
  price: number
  messages: number
  extraCost: number
  icon: any
  color: string
  features: string[]
}

interface VaultedPaymentMethod {
  id: string
  vault_id: string
  type: "card" | "paypal"
  last_digits?: string
  brand?: string
  card_type?: string
  expiry?: string
  paypal_email?: string
  is_default: boolean
  created_at: string
}

const PLANS: Record<string, PlanDetails> = {
  basic: {
    id: "basic",
    name: "Basic Homie",
    price: 3,
    messages: 3,
    extraCost: 1.0,
    icon: Star,
    color: "purple",
    features: [
      "3 free token-messages",
      "$1 per extra message",
      "Basic code generation",
      "Community support",
      "Follow-up questions free",
    ],
  },
  builder: {
    id: "builder",
    name: "Builder Homie",
    price: 6,
    messages: 10,
    extraCost: 0.9,
    icon: Rocket,
    color: "green",
    features: [
      "10 free token-messages",
      "$0.90 per extra message",
      "Advanced code generation",
      "Priority support",
      "Multi-agent workflows",
      "Follow-up questions free",
    ],
  },
  architect: {
    id: "architect",
    name: "Architect Homie",
    price: 9,
    messages: 25,
    extraCost: 0.8,
    icon: Crown,
    color: "blue",
    features: [
      "25 free token-messages",
      "$0.80 per extra message",
      "Premium code generation",
      "Dedicated support",
      "Advanced AI features",
      "Custom integrations",
      "Follow-up questions free",
    ],
  },
}

const TOPUP_OPTIONS = {
  1: { price: "1.00", messages: 1 },
  5: { price: "4.50", messages: 5 },
  10: { price: "9.00", messages: 10 },
  25: { price: "20.00", messages: 25 },
}

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [plan, setPlan] = useState<string | null>(null)
  const [topupMessages, setTopupMessages] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [userSession, setUserSession] = useState<any>(null)
  const [paymentStep, setPaymentStep] = useState<"method" | "processing" | "success">("method")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "new_card" | "paypal" | "apple_pay" | "google_pay" | string
  >("new_card")
  const [vaultedMethods, setVaultedMethods] = useState<VaultedPaymentMethod[]>([])
  const [savePaymentMethod, setSavePaymentMethod] = useState(false)

  // Card form state
  const [cardForm, setCardForm] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  })

  useEffect(() => {
    const planParam = searchParams.get("plan")
    const topupParam = searchParams.get("topup")

    if (planParam && PLANS[planParam]) {
      setPlan(planParam)
    } else if (topupParam && TOPUP_OPTIONS[topupParam as keyof typeof TOPUP_OPTIONS]) {
      setTopupMessages(Number(topupParam))
    } else {
      router.push("/pricing")
    }

    // Check for user session
    const sessionToken = localStorage.getItem("session_token")
    if (sessionToken) {
      fetch("/api/user/dashboard", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUserSession(data.data.user)
            loadVaultedPaymentMethods(sessionToken)
          }
        })
        .catch(console.error)
    }
  }, [searchParams, router])

  const loadVaultedPaymentMethods = async (sessionToken: string) => {
    try {
      const response = await fetch("/api/user/payment-methods", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      })
      const data = await response.json()
      if (data.success) {
        setVaultedMethods(data.payment_methods)
        // Set default payment method if available
        const defaultMethod = data.payment_methods.find((m: VaultedPaymentMethod) => m.is_default)
        if (defaultMethod) {
          setSelectedPaymentMethod(defaultMethod.vault_id)
        }
      }
    } catch (error) {
      console.error("Failed to load payment methods:", error)
    }
  }

  const handleCardPayment = async () => {
    if (!userSession) return

    setLoading(true)
    setPaymentStep("processing")

    try {
      const amount = plan
        ? PLANS[plan].price.toString()
        : TOPUP_OPTIONS[topupMessages as keyof typeof TOPUP_OPTIONS].price
      const description = plan ? `${PLANS[plan].name} Subscription` : `Code Homie Top-up: ${topupMessages} messages`

      const response = await fetch("/api/paypal/create-card-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          description,
          cardDetails: {
            number: cardForm.number.replace(/\s/g, ""),
            expiry: cardForm.expiry.replace("/", ""),
            security_code: cardForm.cvc,
            name: cardForm.name,
          },
          billingAddress: {
            address_line_1: cardForm.address,
            admin_area_2: cardForm.city,
            admin_area_1: cardForm.state,
            postal_code: cardForm.zip,
            country_code: cardForm.country,
          },
          userEmail: userSession.email,
          userId: userSession.id,
          savePaymentMethod,
          messages: topupMessages,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPaymentStep("success")
        // Reload vaulted methods if payment method was saved
        if (savePaymentMethod) {
          const sessionToken = localStorage.getItem("session_token")
          if (sessionToken) {
            loadVaultedPaymentMethods(sessionToken)
          }
        }
      } else {
        throw new Error(data.error || "Payment failed")
      }
    } catch (error: any) {
      console.error("Payment error:", error)
      alert("Payment failed: " + error.message)
      setPaymentStep("method")
    } finally {
      setLoading(false)
    }
  }

  const handleVaultedPayment = async (vaultId: string) => {
    if (!userSession) return

    setLoading(true)
    setPaymentStep("processing")

    try {
      const amount = plan
        ? PLANS[plan].price.toString()
        : TOPUP_OPTIONS[topupMessages as keyof typeof TOPUP_OPTIONS].price
      const description = plan ? `${PLANS[plan].name} Subscription` : `Code Homie Top-up: ${topupMessages} messages`

      const response = await fetch("/api/paypal/pay-with-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultId,
          amount,
          description,
          userId: userSession.id,
          messages: topupMessages,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPaymentStep("success")
      } else {
        throw new Error(data.error || "Payment failed")
      }
    } catch (error: any) {
      console.error("Payment error:", error)
      alert("Payment failed: " + error.message)
      setPaymentStep("method")
    } finally {
      setLoading(false)
    }
  }

  const handlePayPalPayment = async () => {
    if (!userSession) return

    setLoading(true)
    setPaymentStep("processing")

    try {
      if (plan) {
        // Subscription
        const response = await fetch("/api/paypal/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan,
            userEmail: userSession.email,
            userId: userSession.id,
          }),
        })

        const data = await response.json()

        if (data.success && data.approval_url) {
          window.location.href = data.approval_url
        } else {
          throw new Error(data.error || "Failed to create subscription")
        }
      } else {
        // One-time payment
        const response = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: topupMessages,
            userEmail: userSession.email,
            userId: userSession.id,
          }),
        })

        const data = await response.json()

        if (data.success && data.approval_url) {
          window.location.href = data.approval_url
        } else {
          throw new Error(data.error || "Failed to create order")
        }
      }
    } catch (error: any) {
      console.error("PayPal payment error:", error)
      alert("Payment failed: " + error.message)
      setPaymentStep("method")
    } finally {
      setLoading(false)
    }
  }

  const deletePaymentMethod = async (methodId: string) => {
    try {
      const sessionToken = localStorage.getItem("session_token")
      if (!sessionToken) return

      const response = await fetch(`/api/user/payment-methods?id=${methodId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sessionToken}` },
      })

      const data = await response.json()
      if (data.success) {
        setVaultedMethods(vaultedMethods.filter((m) => m.id !== methodId))
        if (selectedPaymentMethod === methodId) {
          setSelectedPaymentMethod("new_card")
        }
      }
    } catch (error) {
      console.error("Failed to delete payment method:", error)
    }
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(" ")
    } else {
      return v
    }
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4)
    }
    return v
  }

  if (!plan && !topupMessages) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Invalid Selection</h1>
          <Link href="/pricing" className="text-purple-400 hover:text-purple-300">
            Return to Pricing
          </Link>
        </div>
      </div>
    )
  }

  const selectedPlan = plan ? PLANS[plan] : null
  const selectedTopup = topupMessages ? TOPUP_OPTIONS[topupMessages as keyof typeof TOPUP_OPTIONS] : null
  const IconComponent = selectedPlan?.icon

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

            <Link
              href="/pricing"
              className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Pricing</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 py-16">
          {/* Checkout Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Secure Checkout
              </span>
            </h1>
            <p className="text-gray-300">
              {selectedPlan
                ? `Complete your subscription to ${selectedPlan.name}`
                : `Top up with ${topupMessages} messages`}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Order Summary */}
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-purple-400 mb-6">Order Summary</h2>

              {selectedPlan && (
                <div className={`bg-gray-800/50 border border-${selectedPlan.color}-500/30 rounded-xl p-6 mb-6`}>
                  <div className="flex items-center gap-3 mb-4">
                    <IconComponent className={`w-8 h-8 text-${selectedPlan.color}-400`} />
                    <h3 className={`text-2xl font-bold text-${selectedPlan.color}-400`}>{selectedPlan.name}</h3>
                  </div>

                  <div className="mb-6">
                    <div className="text-3xl font-bold text-white mb-2">
                      ${selectedPlan.price}
                      <span className="text-lg">/month</span>
                    </div>
                    <p className="text-gray-400 text-sm">Billed monthly, cancel anytime</p>
                  </div>

                  <div className="space-y-3">
                    {selectedPlan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTopup && (
                <div className="bg-gray-800/50 border border-cyan-500/30 rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Zap className="w-8 h-8 text-cyan-400" />
                    <h3 className="text-2xl font-bold text-cyan-400">Token Top-up</h3>
                  </div>

                  <div className="mb-6">
                    <div className="text-3xl font-bold text-white mb-2">
                      ${selectedTopup.price}
                      <span className="text-lg"> one-time</span>
                    </div>
                    <p className="text-gray-400 text-sm">{selectedTopup.messages} messages added to your account</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">Instant token credit</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">No expiration</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">Use anytime</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Features */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span>256-bit SSL encryption</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <CreditCard className="w-4 h-4 text-green-400" />
                  <span>PayPal secure payment processing</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <Clock className="w-4 h-4 text-green-400" />
                  <span>Instant activation</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-purple-400 mb-6">Payment Method</h2>

              {paymentStep === "method" && (
                <div className="space-y-6">
                  {/* User Info */}
                  {userSession ? (
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-green-400 mb-2">Account Information</h3>
                      <p className="text-gray-300">Email: {userSession.email}</p>
                      <p className="text-gray-300">Name: {userSession.name || "Not provided"}</p>
                    </div>
                  ) : (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                      <p className="text-red-400">Please log in to continue with checkout</p>
                    </div>
                  )}

                  {/* Saved Payment Methods */}
                  {vaultedMethods.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-purple-400 mb-4">Saved Payment Methods</h3>
                      <div className="space-y-3">
                        {vaultedMethods.map((method) => (
                          <div
                            key={method.id}
                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                              selectedPaymentMethod === method.vault_id
                                ? "border-purple-500 bg-purple-500/10"
                                : "border-gray-600 hover:border-gray-500"
                            }`}
                            onClick={() => setSelectedPaymentMethod(method.vault_id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  checked={selectedPaymentMethod === method.vault_id}
                                  onChange={() => setSelectedPaymentMethod(method.vault_id)}
                                  className="text-purple-500"
                                />
                                <CreditCard className="w-5 h-5 text-gray-400" />
                                <div>
                                  <p className="text-white font-medium">
                                    {method.brand} •••• {method.last_digits}
                                  </p>
                                  <p className="text-gray-400 text-sm">
                                    Expires {method.expiry}
                                    {method.is_default && <span className="text-purple-400 ml-2">(Default)</span>}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deletePaymentMethod(method.id)
                                }}
                                className="text-red-400 hover:text-red-300 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment Method Selection */}
                  <div>
                    <h3 className="text-lg font-semibold text-purple-400 mb-4">
                      {vaultedMethods.length > 0 ? "Or choose a new payment method" : "Choose Payment Method"}
                    </h3>
                    <div className="space-y-3">
                      {/* New Card */}
                      <div
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedPaymentMethod === "new_card"
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-gray-600 hover:border-gray-500"
                        }`}
                        onClick={() => setSelectedPaymentMethod("new_card")}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            checked={selectedPaymentMethod === "new_card"}
                            onChange={() => setSelectedPaymentMethod("new_card")}
                            className="text-purple-500"
                          />
                          <CreditCard className="w-5 h-5 text-gray-400" />
                          <span className="text-white">Credit or Debit Card</span>
                        </div>
                      </div>

                      {/* PayPal */}
                      <div
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedPaymentMethod === "paypal"
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-gray-600 hover:border-gray-500"
                        }`}
                        onClick={() => setSelectedPaymentMethod("paypal")}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            checked={selectedPaymentMethod === "paypal"}
                            onChange={() => setSelectedPaymentMethod("paypal")}
                            className="text-purple-500"
                          />
                          <img
                            src="https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-100px.png"
                            alt="PayPal"
                            className="h-5"
                          />
                          <span className="text-white">PayPal</span>
                        </div>
                      </div>

                      {/* Apple Pay */}
                      <div
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedPaymentMethod === "apple_pay"
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-gray-600 hover:border-gray-500"
                        }`}
                        onClick={() => setSelectedPaymentMethod("apple_pay")}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            checked={selectedPaymentMethod === "apple_pay"}
                            onChange={() => setSelectedPaymentMethod("apple_pay")}
                            className="text-purple-500"
                          />
                          <Apple className="w-5 h-5 text-gray-400" />
                          <span className="text-white">Apple Pay</span>
                          <span className="text-xs text-gray-400">(Coming Soon)</span>
                        </div>
                      </div>

                      {/* Google Pay */}
                      <div
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedPaymentMethod === "google_pay"
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-gray-600 hover:border-gray-500"
                        }`}
                        onClick={() => setSelectedPaymentMethod("google_pay")}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            checked={selectedPaymentMethod === "google_pay"}
                            onChange={() => setSelectedPaymentMethod("google_pay")}
                            className="text-purple-500"
                          />
                          <Smartphone className="w-5 h-5 text-gray-400" />
                          <span className="text-white">Google Pay</span>
                          <span className="text-xs text-gray-400">(Coming Soon)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Form */}
                  {selectedPaymentMethod === "new_card" && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-white">Card Information</h4>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-300 mb-2">Card Number</label>
                          <input
                            type="text"
                            value={cardForm.number}
                            onChange={(e) => setCardForm({ ...cardForm, number: formatCardNumber(e.target.value) })}
                            placeholder="1234 5678 9012 3456"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                            maxLength={19}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Expiry Date</label>
                          <input
                            type="text"
                            value={cardForm.expiry}
                            onChange={(e) => setCardForm({ ...cardForm, expiry: formatExpiry(e.target.value) })}
                            placeholder="MM/YY"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                            maxLength={5}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">CVC</label>
                          <input
                            type="text"
                            value={cardForm.cvc}
                            onChange={(e) => setCardForm({ ...cardForm, cvc: e.target.value.replace(/\D/g, "") })}
                            placeholder="123"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                            maxLength={4}
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-300 mb-2">Cardholder Name</label>
                          <input
                            type="text"
                            value={cardForm.name}
                            onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                            placeholder="John Doe"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <h4 className="text-lg font-semibold text-white mt-6">Billing Address</h4>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                          <input
                            type="text"
                            value={cardForm.address}
                            onChange={(e) => setCardForm({ ...cardForm, address: e.target.value })}
                            placeholder="123 Main St"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                          <input
                            type="text"
                            value={cardForm.city}
                            onChange={(e) => setCardForm({ ...cardForm, city: e.target.value })}
                            placeholder="New York"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
                          <input
                            type="text"
                            value={cardForm.state}
                            onChange={(e) => setCardForm({ ...cardForm, state: e.target.value })}
                            placeholder="NY"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">ZIP Code</label>
                          <input
                            type="text"
                            value={cardForm.zip}
                            onChange={(e) => setCardForm({ ...cardForm, zip: e.target.value })}
                            placeholder="10001"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                          <select
                            value={cardForm.country}
                            onChange={(e) => setCardForm({ ...cardForm, country: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                          >
                            <option value="US">United States</option>
                            <option value="CA">Canada</option>
                            <option value="GB">United Kingdom</option>
                            <option value="AU">Australia</option>
                          </select>
                        </div>
                      </div>

                      {/* Save Payment Method */}
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="save-payment"
                          checked={savePaymentMethod}
                          onChange={(e) => setSavePaymentMethod(e.target.checked)}
                          className="text-purple-500"
                        />
                        <label htmlFor="save-payment" className="text-sm text-gray-300">
                          Save this payment method for future purchases
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Terms */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" id="terms" className="mt-1" defaultChecked />
                      <label htmlFor="terms" className="text-sm text-gray-300">
                        I agree to the{" "}
                        <Link href="/terms" className="text-purple-400 hover:text-purple-300">
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-purple-400 hover:text-purple-300">
                          Privacy Policy
                        </Link>
                      </label>
                    </div>
                  </div>

                  {/* Payment Button */}
                  <button
                    onClick={() => {
                      if (selectedPaymentMethod === "new_card") {
                        handleCardPayment()
                      } else if (selectedPaymentMethod === "paypal") {
                        handlePayPalPayment()
                      } else if (vaultedMethods.find((m) => m.vault_id === selectedPaymentMethod)) {
                        handleVaultedPayment(selectedPaymentMethod)
                      } else {
                        alert("This payment method is coming soon!")
                      }
                    }}
                    disabled={loading || !userSession}
                    className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-6 py-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        <span>Complete Payment - ${selectedPlan ? selectedPlan.price : selectedTopup?.price}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {paymentStep === "processing" && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-purple-400 mb-2">Processing Payment</h3>
                  <p className="text-gray-300">Please wait while we process your payment...</p>
                </div>
              )}

              {paymentStep === "success" && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-green-400 mb-2">Payment Successful!</h3>
                  <p className="text-gray-300 mb-6">
                    {selectedPlan
                      ? `Your ${selectedPlan.name} subscription is now active.`
                      : `${topupMessages} messages have been added to your account.`}
                  </p>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    <Wallet className="w-5 h-5" />
                    <span>Go to Dashboard</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 text-center">
            <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span>Secure & Encrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span>Instant Access</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Cancel Anytime</span>
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
