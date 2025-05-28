"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Mail, Shield } from "lucide-react"

interface LoginProps {
  onLogin: (token: string, user: any) => void
}

export function AuthLogin({ onLogin }: LoginProps) {
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSendOTP = async () => {
    if (!email) {
      setError("Email is required")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to send OTP")
      }

      setStep("otp")

      // Show OTP in development
      if (process.env.NODE_ENV === "development" && data.otp) {
        setError(`Development OTP: ${data.otp}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || "Invalid OTP")
      }

      // Store JWT token in localStorage
      localStorage.setItem("auth_token", data.token)

      // Call the onLogin callback with the token and user data
      onLogin(data.token, data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify OTP")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black border-green-500/30">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="w-12 h-12 text-green-400" />
          </div>
          <CardTitle className="text-2xl text-green-400">CODE HOMIE ACCESS</CardTitle>
          <CardDescription className="text-green-500/70">
            {step === "email" ? "Enter your email to receive an OTP" : "Enter the OTP sent to your email"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "email" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm text-green-400">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500/50" />
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-black border-green-500/30 text-green-400 placeholder:text-green-500/50"
                    onKeyPress={(e) => e.key === "Enter" && handleSendOTP()}
                  />
                </div>
              </div>
              <Button
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full bg-green-500/20 text-green-400 hover:bg-green-500/30"
              >
                {loading ? "SENDING..." : "SEND OTP"}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm text-green-400">OTP Code</label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-widest bg-black border-green-500/30 text-green-400"
                  onKeyPress={(e) => e.key === "Enter" && handleVerifyOTP()}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setStep("email")}
                  variant="outline"
                  className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                >
                  BACK
                </Button>
                <Button
                  onClick={handleVerifyOTP}
                  disabled={loading}
                  className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30"
                >
                  {loading ? "VERIFYING..." : "VERIFY"}
                </Button>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
