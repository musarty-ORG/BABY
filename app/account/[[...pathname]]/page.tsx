"use client"

import { AccountView } from "@neondatabase/neon-js/auth/react/ui"

interface AccountPageProps {
  params: {
    pathname?: string[]
  }
}

export default function AccountPage({ params }: AccountPageProps) {
  const pathname = params.pathname?.[0] || 'profile'
  
  return (
    <div className="container mx-auto py-8">
      <AccountView pathname={pathname} />
    </div>
  )
}
