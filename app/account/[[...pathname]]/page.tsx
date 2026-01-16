"use client"

import { AccountView } from "@neondatabase/neon-js/auth/react/ui"
import { use } from "react"

interface AccountPageProps {
  params: Promise<{
    pathname?: string[]
  }>
}

export default function AccountPage({ params }: AccountPageProps) {
  const resolvedParams = use(params)
  const path = resolvedParams.pathname?.[0] || 'profile'
  
  return (
    <div className="container mx-auto py-8">
      <AccountView path={path} />
    </div>
  )
}
