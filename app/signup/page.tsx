"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Terminal, Mail, ArrowRight, Shield, Zap, User } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [otp, setOtp] = useState("")
  const [step, setStep] = useState<"details" | "otp">("details")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { login } = useAuth()
  const router = useRouter()

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, isSignup: true }),
      })

      const data = await response.json()

      if (data.success) {
        setStep("otp")
      } else {
        setError(data.error || "Failed to send OTP")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, name, isSignup: true }),
      })

      const data = await response.json()

      if (data.success) {
        login(data.token, data.user)
        router.push("/dashboard?welcome=true")
      } else {
        setError(data.error || "Invalid OTP")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto p-6">
        <div className="bg-gray-900/50 border border-purple-500/30 rounded-2xl backdrop-blur-sm shadow-2xl shadow-purple-500/10 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Terminal className="w-8 h-8 text-purple-400" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                CODE HOMIE
              </h1>
            </div>
            <p className="text-purple-300/70 text-sm">
              {step === "details" ? "Create your account to get started" : "Enter the OTP sent to your email"}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3 mb-6">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Details Step */}
          {step === "details" && (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-purple-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-3 pl-10 text-purple-100 placeholder-purple-500/50 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50"
                    placeholder="Your Name"
                    required
                  />
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-500/50" />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-purple-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-3 pl-10 text-purple-100 placeholder-purple-500/50 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50"
                    placeholder="your@email.com"
                    required
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-500/50" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email || !name}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* OTP Step */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-purple-300 mb-2">
                  Verification Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-3 pl-10 text-purple-100 placeholder-purple-500/50 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 text-center text-lg tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-500/50" />
                </div>
                <p className="text-xs text-purple-500/70 mt-2">OTP sent to {email}</p>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Signup</span>
                    <Zap className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep("details")}
                className="w-full text-purple-400 hover:text-purple-300 text-sm transition-colors"
              >
                ← Back to details
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-purple-500/70 text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-purple-400 hover:text-purple-300 font-semibold">
                Login
              </Link>
            </p>
            <p className="text-purple-500/50 text-xs mt-2">
              <Link href="/" className="hover:text-purple-400">
                ← Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
