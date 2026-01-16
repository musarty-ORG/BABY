export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Header Skeleton */}
      <header className="relative z-10 border-b border-purple-500/30 bg-black/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-700 rounded-lg animate-pulse"></div>
              <div>
                <div className="w-32 h-6 bg-gray-700 rounded animate-pulse mb-1"></div>
                <div className="w-20 h-3 bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="w-24 h-10 bg-gray-700 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section Skeleton */}
        <div className="mb-8">
          <div className="w-64 h-8 bg-gray-700 rounded animate-pulse mb-2"></div>
          <div className="w-96 h-5 bg-gray-700 rounded animate-pulse"></div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-gray-900/50 border border-gray-700 rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 bg-gray-700 rounded animate-pulse"></div>
                <div className="w-20 h-5 bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="w-16 h-8 bg-gray-700 rounded animate-pulse mb-1"></div>
              <div className="w-24 h-4 bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Tab Navigation Skeleton */}
        <div className="border-b border-gray-700 mb-8">
          <div className="flex space-x-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-20 h-10 bg-gray-700 rounded animate-pulse"
              ></div>
            ))}
          </div>
        </div>

        {/* Content Area Skeleton */}
        <div className="space-y-8">
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
            <div className="w-32 h-6 bg-gray-700 rounded animate-pulse mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-full h-16 bg-gray-700 rounded animate-pulse"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
