import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "NEXUS - AI Agent",
  description: "Elite AI Agent powered by Llama 4 Scout",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-green-400">{children}</body>
    </html>
  )
}
