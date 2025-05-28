"use client"

import { useState } from "react"

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")

  const handleSendOTP = async () => {
    setError("")
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw errorData
      }

      setOtpSent(true)
    } catch (error: any) {
      // Handle both string errors and API error objects
      if (error?.error?.message) {
        setError(error.error.message)
      } else if (typeof error === "string") {
        setError(error)
      } else if (error?.message) {
        setError(error.message)
      } else {
        setError("Network error. Please try again.")
      }
    }
  }

  const handleVerifyOTP = async () => {
    setError("")
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber, otp }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw errorData
      }

      // Redirect to home page or desired route upon successful login
      window.location.href = "/"
    } catch (error: any) {
      // Handle both string errors and API error objects
      if (error?.error?.message) {
        setError(error.error.message)
      } else if (typeof error === "string") {
        setError(error)
      } else if (error?.message) {
        setError(error.message)
      } else {
        setError("Network error. Please try again.")
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl mb-4">Login</h2>
        {error && <p className="text-red-500 text-sm italic">{error}</p>}
        {!otpSent ? (
          <div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phoneNumber">
                Phone Number
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="phoneNumber"
                type="tel"
                placeholder="Enter phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                type="button"
                onClick={handleSendOTP}
              >
                Send OTP
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="otp">
                OTP
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="otp"
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                type="button"
                onClick={handleVerifyOTP}
              >
                Verify OTP
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
