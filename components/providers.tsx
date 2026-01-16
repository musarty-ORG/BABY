"use client"

import type React from "react"
import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react/ui"
import { authClient } from "@/lib/auth"
import "@neondatabase/neon-js/ui/css"

export function Providers({ children }: { children: React.ReactNode }) {
  // If authClient is not configured, render children without auth
  if (!authClient) {
    return <>{children}</>
  }

  return (
    <NeonAuthUIProvider authClient={authClient} redirectTo="/dashboard" emailOtp={true}>
      {children}
    </NeonAuthUIProvider>
  )
}
