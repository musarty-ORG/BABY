'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CreditCard,
  Zap,
  Trash2,
  Plus,
  Star,
  Crown,
  Rocket,
  Activity,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

interface DashboardData {
  user: {
    id: string
    email: string
    name: string
    role: string
    status: string
    created_at: string
    last_login: string
  }
  tokens: {
    total_balance: number
    monthly_balance: number
    topup_balance: number
    plan: string
  }
  token_history: Array<{
    id: string
    delta: number
    reason: string
    created_at: string
    type: string
  }>
  payment_methods: Array<{
    id: string
    vault_id: string
    type: 'card' | 'paypal'
    last_digits?: string
    brand?: string
    card_type?: string
    expiry?: string
    paypal_email?: string
    is_default: boolean
    created_at: string
  }>
  subscription: {
    id: string
    status: string
    plan_id: string
    subscriber_email: string
  } | null
  recent_activity: Array<{
    id: string
    type: string
    endpoint: string
    method: string
    status_code: number
    duration: number
    timestamp: string
  }>
  usage_stats: {
    total_api_calls: number
    avg_response_time: number
  }
}

const PLAN_DETAILS = {
  basic: { name: 'Basic Homie', icon: Star, color: 'purple', price: 3 },
  builder: { name: 'Builder Homie', icon: Rocket, color: 'green', price: 6 },
  architect: { name: 'Architect Homie', icon: Crown, color: 'blue', price: 9 },
  none: { name: 'No Plan', icon: AlertCircle, color: 'gray', price: 0 },
}

export default function DashboardPage() {
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'tokens' | 'payments' | 'subscription' | 'activity'
  >('overview')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token')
      if (!sessionToken) {
        router.push('/')
        return
      }

      const response = await fetch('/api/user/dashboard-enhanced', {
        headers: { Authorization: `Bearer ${sessionToken}` },
      })

      const data = await response.json()
      if (data.success) {
        setDashboardData(data.data)
      } else {
        console.error('Failed to load dashboard:', data.error)
        router.push('/')
      }
    } catch (error) {
      console.error('Dashboard error:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const deletePaymentMethod = async (methodId: string) => {
    try {
      const sessionToken = localStorage.getItem('session_token')
      if (!sessionToken) return

      const response = await fetch(`/api/user/payment-methods?id=${methodId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      })

      const data = await response.json()
      if (data.success) {
        await loadDashboardData() // Reload data
      } else {
        alert('Failed to delete payment method: ' + data.error)
      }
    } catch (error) {
      console.error('Failed to delete payment method:', error)
      alert('Failed to delete payment method')
    }
  }

  const setDefaultPaymentMethod = async (methodId: string) => {
    try {
      const sessionToken = localStorage.getItem('session_token')
      if (!sessionToken) return

      const response = await fetch('/api/user/payment-methods/default', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ methodId }),
      })

      const data = await response.json()
      if (data.success) {
        await loadDashboardData() // Reload data
      } else {
        alert('Failed to set default payment method: ' + data.error)
      }
    } catch (error) {
      console.error('Failed to set default payment method:', error)
      alert('Failed to set default payment method')
    }
  }

  const cancelSubscription = async () => {
    if (
      !confirm(
        'Are you sure you want to cancel your subscription? This action cannot be undone.'
      )
    ) {
      return
    }

    try {
      const sessionToken = localStorage.getItem('session_token')
      if (!sessionToken) return

      const response = await fetch('/api/user/subscription', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      })

      const data = await response.json()
      if (data.success) {
        alert('Subscription cancelled successfully')
        await loadDashboardData() // Reload data
      } else {
        alert('Failed to cancel subscription: ' + data.error)
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
      alert('Failed to cancel subscription')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400"></div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">
            Failed to Load Dashboard
          </h1>
          <Link href="/" className="text-purple-400 hover:text-purple-300">
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  const currentPlan =
    PLAN_DETAILS[dashboardData.tokens.plan as keyof typeof PLAN_DETAILS] ||
    PLAN_DETAILS.none
  const PlanIcon = currentPlan.icon

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

      {/* Header */}
      <header className="relative z-10 border-b border-purple-500/30 bg-black/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hndkjn-12r7gakfDUd4Wz8G5F2UxDVU7EKkCj.png"
                alt="Code Homie Logo"
                className="w-12 h-12 rounded-lg"
              />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  CODE HOMIE
                </h1>
                <p className="text-xs text-purple-300/70">DASHBOARD</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-300">
                  {dashboardData.user.email}
                </p>
                <p className="text-xs text-purple-400 capitalize">
                  {dashboardData.user.role}
                </p>
              </div>
              <Link
                href="/"
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Back to App
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {dashboardData.user.name || 'Developer'}! 👋
          </h2>
          <p className="text-gray-400">
            Manage your Code Homie account, tokens, and subscriptions.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-6 h-6 text-yellow-400" />
              <h3 className="text-lg font-semibold">Total Tokens</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {dashboardData.tokens.total_balance}
            </p>
            <p className="text-sm text-gray-400">Available messages</p>
          </div>

          <div className="bg-gray-900/50 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <PlanIcon className={`w-6 h-6 text-${currentPlan.color}-400`} />
              <h3 className="text-lg font-semibold">Current Plan</h3>
            </div>
            <p className="text-2xl font-bold text-white">{currentPlan.name}</p>
            <p className="text-sm text-gray-400">${currentPlan.price}/month</p>
          </div>

          <div className="bg-gray-900/50 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold">API Calls</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {dashboardData.usage_stats.total_api_calls}
            </p>
            <p className="text-sm text-gray-400">This month</p>
          </div>

          <div className="bg-gray-900/50 border border-cyan-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-cyan-400" />
              <h3 className="text-lg font-semibold">Avg Response</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {dashboardData.usage_stats.avg_response_time}ms
            </p>
            <p className="text-sm text-gray-400">Response time</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-700 mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'tokens', label: 'Tokens', icon: Zap },
              { id: 'payments', label: 'Payment Methods', icon: CreditCard },
              { id: 'subscription', label: 'Subscription', icon: Crown },
              { id: 'activity', label: 'Activity', icon: Activity },
            ].map((tab) => {
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Account Status */}
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Account Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 mb-2">Account Status</p>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 capitalize">
                      {dashboardData.user.status}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 mb-2">Member Since</p>
                  <p className="text-white">
                    {new Date(
                      dashboardData.user.created_at
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 mb-2">Last Login</p>
                  <p className="text-white">
                    {new Date(
                      dashboardData.user.last_login
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 mb-2">Payment Methods</p>
                  <p className="text-white">
                    {dashboardData.payment_methods.length} saved
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href="/checkout?topup=10"
                  className="bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-lg text-center transition-colors"
                >
                  <Zap className="w-6 h-6 mx-auto mb-2" />
                  <p className="font-semibold">Buy Tokens</p>
                  <p className="text-sm opacity-80">Top up your balance</p>
                </Link>
                <Link
                  href="/pricing"
                  className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-lg text-center transition-colors"
                >
                  <Crown className="w-6 h-6 mx-auto mb-2" />
                  <p className="font-semibold">Upgrade Plan</p>
                  <p className="text-sm opacity-80">Get more features</p>
                </Link>
                <button
                  onClick={() => setActiveTab('payments')}
                  className="bg-green-600 hover:bg-green-500 text-white p-4 rounded-lg text-center transition-colors"
                >
                  <CreditCard className="w-6 h-6 mx-auto mb-2" />
                  <p className="font-semibold">Manage Cards</p>
                  <p className="text-sm opacity-80">Add or remove cards</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="space-y-8">
            {/* Token Balance */}
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Token Balance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-gray-400 mb-2">Total Balance</p>
                  <p className="text-3xl font-bold text-white">
                    {dashboardData.tokens.total_balance}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 mb-2">Monthly Tokens</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {dashboardData.tokens.monthly_balance}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 mb-2">Top-up Tokens</p>
                  <p className="text-3xl font-bold text-cyan-400">
                    {dashboardData.tokens.topup_balance}
                  </p>
                </div>
              </div>
              <div className="mt-6 text-center">
                <Link
                  href="/checkout?topup=10"
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Buy More Tokens
                </Link>
              </div>
            </div>

            {/* Token History */}
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Recent Token Activity</h3>
              <div className="space-y-3">
                {dashboardData.token_history.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-3 border-b border-gray-700"
                  >
                    <div>
                      <p className="text-white font-medium">{entry.reason}</p>
                      <p className="text-gray-400 text-sm">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div
                      className={`text-lg font-bold ${entry.delta > 0 ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {entry.delta > 0 ? '+' : ''}
                      {entry.delta}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-8">
            {/* Payment Methods */}
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Saved Payment Methods</h3>
                <Link
                  href="/checkout?topup=1"
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add New
                </Link>
              </div>

              {dashboardData.payment_methods.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No payment methods saved</p>
                  <Link
                    href="/checkout?topup=1"
                    className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Your First Payment Method
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData.payment_methods.map((method) => (
                    <div
                      key={method.id}
                      className="border border-gray-600 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-gray-400" />
                        <div>
                          <p className="text-white font-medium">
                            {method.brand} •••• {method.last_digits}
                            {method.is_default && (
                              <span className="text-purple-400 ml-2">
                                (Default)
                              </span>
                            )}
                          </p>
                          <p className="text-gray-400 text-sm">
                            Expires {method.expiry} • Added{' '}
                            {new Date(method.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!method.is_default && (
                          <button
                            onClick={() => setDefaultPaymentMethod(method.id)}
                            className="text-purple-400 hover:text-purple-300 px-3 py-1 text-sm border border-purple-500 rounded"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => deletePaymentMethod(method.id)}
                          className="text-red-400 hover:text-red-300 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="space-y-8">
            {/* Current Subscription */}
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Current Subscription</h3>

              {dashboardData.subscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {currentPlan.name}
                      </p>
                      <p className="text-gray-400">
                        ${currentPlan.price}/month
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Status</p>
                      <p
                        className={`font-semibold ${
                          dashboardData.subscription.status === 'ACTIVE'
                            ? 'text-green-400'
                            : 'text-yellow-400'
                        }`}
                      >
                        {dashboardData.subscription.status}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-4">
                    <button
                      onClick={cancelSubscription}
                      className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancel Subscription
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Crown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No active subscription</p>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    <Crown className="w-5 h-5" />
                    Choose a Plan
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-8">
            {/* Recent Activity */}
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Recent API Activity</h3>
              <div className="space-y-3">
                {dashboardData.recent_activity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-3 border-b border-gray-700"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {activity.endpoint}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {activity.method} •{' '}
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 text-sm">
                        {activity.duration}ms
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          activity.status_code < 300
                            ? 'bg-green-900 text-green-300'
                            : activity.status_code < 400
                              ? 'bg-yellow-900 text-yellow-300'
                              : 'bg-red-900 text-red-300'
                        }`}
                      >
                        {activity.status_code}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
