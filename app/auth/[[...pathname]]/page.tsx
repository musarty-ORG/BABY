"use client"

import { AuthView } from "@neondatabase/neon-js/auth/react/ui"

interface AuthPageProps {
  params: {
    pathname?: string[]
  }
}

export default function AuthPage({ params }: AuthPageProps) {
  const pathname = params.pathname?.[0] || 'sign-in'
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <AuthView pathname={pathname} />
    </div>
  )
}
