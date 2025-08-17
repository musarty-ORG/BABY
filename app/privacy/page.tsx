import Link from "next/link"

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
      
      {/* Header */}
      <header className="relative z-10 border-b border-purple-500/30 bg-black/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  CODE HOMIE
                </h1>
              </div>
            </Link>
            
            <nav className="flex items-center gap-6">
              <Link href="/pricing" className="text-gray-400 hover:text-purple-400 transition-colors font-semibold">
                Pricing
              </Link>
              <Link href="/dashboard" className="text-gray-400 hover:text-purple-400 transition-colors font-semibold">
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-16">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-8">
            Privacy Policy
          </h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 text-lg mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <h2 className="text-2xl font-semibold text-purple-400 mt-8 mb-4">1. Information We Collect</h2>
            <p className="text-gray-300 mb-4">
              We collect information you provide directly to us, such as when you create an account, use our services, or contact us.
            </p>

            <h2 className="text-2xl font-semibold text-purple-400 mt-8 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-300 mb-4">
              We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.
            </p>

            <h2 className="text-2xl font-semibold text-purple-400 mt-8 mb-4">3. Information Sharing</h2>
            <p className="text-gray-300 mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share information in limited circumstances as described in this policy.
            </p>

            <h2 className="text-2xl font-semibold text-purple-400 mt-8 mb-4">4. Data Security</h2>
            <p className="text-gray-300 mb-4">
              We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>

            <h2 className="text-2xl font-semibold text-purple-400 mt-8 mb-4">5. Code and Data Processing</h2>
            <p className="text-gray-300 mb-4">
              Code you submit for processing is used solely to provide our AI services. We do not store or use your code for training purposes without explicit consent.
            </p>

            <h2 className="text-2xl font-semibold text-purple-400 mt-8 mb-4">6. Cookies and Tracking</h2>
            <p className="text-gray-300 mb-4">
              We use cookies and similar technologies to enhance your experience, analyze usage patterns, and maintain your session.
            </p>

            <h2 className="text-2xl font-semibold text-purple-400 mt-8 mb-4">7. Your Rights</h2>
            <p className="text-gray-300 mb-4">
              You have the right to access, update, or delete your personal information. You may also opt out of certain communications.
            </p>

            <h2 className="text-2xl font-semibold text-purple-400 mt-8 mb-4">8. Changes to This Policy</h2>
            <p className="text-gray-300 mb-4">
              We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page.
            </p>

            <h2 className="text-2xl font-semibold text-purple-400 mt-8 mb-4">9. Contact Us</h2>
            <p className="text-gray-300 mb-4">
              If you have any questions about this privacy policy, please contact us through our support channels.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-purple-500/30 bg-black/90 backdrop-blur-sm mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-purple-500/70 text-sm">
              Code Homie | Professional AI Coding Assistant
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}