'use client'

import Link from 'next/link'
import { Code, Brain, Zap } from 'lucide-react'

interface SiteHeaderProps {
  title: string
  subtitle: string
  variant?: 'home' | 'builder'
  showStatus?: boolean
}

export function SiteHeader({
  title,
  subtitle,
  variant = 'home',
  showStatus = true,
}: SiteHeaderProps) {
  return (
    <header className="relative z-10 border-b border-purple-500/30 bg-black/90 backdrop-blur-sm sticky top-0">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hndkjn-12r7gakfDUd4Wz8G5F2UxDVU7EKkCj.png"
              alt="Code Homie Logo"
              className="w-12 h-12 rounded-lg"
            />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                {title}
              </h1>
              <p className="text-xs text-purple-300/70">{subtitle}</p>
            </div>
          </div>

          {/* Navigation and Status */}
          {variant === 'home' ? (
            <nav className="flex items-center gap-6">
              <Link
                href="/"
                className="text-purple-400 font-semibold border-b-2 border-purple-400 pb-1"
              >
                Home
              </Link>
              <Link
                href="/multi-agent"
                className="text-gray-400 hover:text-purple-400 transition-colors font-semibold"
              >
                CODE HOMIE
              </Link>
              <Link
                href="/pricing"
                className="text-gray-400 hover:text-purple-400 transition-colors font-semibold"
              >
                Pricing
              </Link>
              {showStatus && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400">ONLINE</span>
                </div>
              )}
            </nav>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <Code className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400">v2.0-DUAL-AI</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400">Multi-Agent</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400">Live Preview</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
