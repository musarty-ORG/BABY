"use client"

import type React from "react"
import { NeonAuthUIProvider } from "@neondatabase/auth/react/ui"
import { neonAuthClient } from "@/lib/neon-auth"
import "@neondatabase/auth/ui/css"

export function Providers({ children }: { children: React.ReactNode }) {
  if (!neonAuthClient) {
    return <>{children}</>
  }

  return (
    <NeonAuthUIProvider authClient={neonAuthClient} redirectTo="/dashboard">
      {children}
    </NeonAuthUIProvider>
  )
}
