"use client"

import { AuthView } from "@neondatabase/auth/react/ui"

export default function AuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <AuthView path="sign-in" />
    </div>
  )
}
