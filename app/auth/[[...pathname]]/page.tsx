"use client"

import { AuthView } from "@neondatabase/neon-js/auth/react/ui"
import { use } from "react"

interface AuthPageProps {
  params: Promise<{
    pathname?: string[]
  }>
}

export default function AuthPage({ params }: AuthPageProps) {
  const resolvedParams = use(params)
  const path = resolvedParams.pathname?.[0] || 'sign-in'
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <AuthView path={path} />
    </div>
  )
}
