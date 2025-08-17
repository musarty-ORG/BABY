import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
      
      <div className="relative z-10 text-center px-4">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-12 max-w-md mx-auto">
          <div className="mb-8">
            <h1 className="text-8xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              404
            </h1>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Page Not Found
            </h2>
            <p className="text-gray-300 mb-8">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
          
          <div className="space-y-4">
            <Link 
              href="/"
              className="block w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200"
            >
              Go Home
            </Link>
            <Link 
              href="/pricing"
              className="block w-full border border-purple-500/50 hover:border-purple-400 text-purple-300 hover:text-purple-200 px-6 py-3 rounded-lg font-semibold transition-all duration-200"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}