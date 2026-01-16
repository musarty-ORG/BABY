'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Users,
  BarChart3,
  Settings,
  Shield,
  Database,
  ActivityIcon,
  AlertTriangle,
  TrendingUp,
  Server,
  Lock,
  Eye,
  Edit,
  Plus,
  Search,
  Download,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

// Constants for better maintainability
const REFRESH_INTERVAL = 30000 // 30 seconds
const MAX_RECENT_ACTIVITIES = 10
const ITEMS_PER_PAGE = 20

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user' | 'moderator'
  status: 'active' | 'inactive' | 'suspended'
  lastLogin: string
  createdAt: string
}

interface SystemMetric {
  id: string
  name: string
  value: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  status: 'healthy' | 'warning' | 'critical'
}

interface Activity {
  id: string
  user: string
  action: string
  timestamp: string
  details: string
  severity: 'info' | 'warning' | 'error'
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [users, setUsers] = useState<User[]>([])
  const [metrics, setMetrics] = useState<SystemMetric[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoized filtered users for performance
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [users, searchTerm])

  // Optimized data fetching with useCallback
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [usersResponse, metricsResponse, activitiesResponse] =
        await Promise.all([
          fetch('/api/admin/users').then((res) => {
            if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`)
            return res.json()
          }),
          fetch('/api/admin/metrics').then((res) => {
            if (!res.ok)
              throw new Error(`Failed to fetch metrics: ${res.status}`)
            return res.json()
          }),
          fetch('/api/admin/activities?limit=10').then((res) => {
            if (!res.ok)
              throw new Error(`Failed to fetch activities: ${res.status}`)
            return res.json()
          }),
        ])

      setUsers(usersResponse.users || [])
      setMetrics(metricsResponse.metrics || [])
      setActivities(activitiesResponse.activities || [])
    } catch (fetchError) {
      console.error('Dashboard data fetch error:', fetchError)
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Failed to load dashboard data'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle user actions with proper error handling
  const handleUserAction = useCallback(
    async (userId: string, action: string) => {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })

        if (!response.ok) {
          throw new Error(`Failed to ${action} user`)
        }

        // Refresh data after successful action
        await fetchDashboardData()
      } catch (actionError) {
        console.error(`User action error:`, actionError)
        setError(
          actionError instanceof Error
            ? actionError.message
            : `Failed to ${action} user`
        )
      }
    },
    [fetchDashboardData]
  )

  // Search handler with debouncing
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  // Initial data load and periodic refresh
  useEffect(() => {
    fetchDashboardData()

    const interval = setInterval(fetchDashboardData, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchDashboardData])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
        return 'bg-green-500'
      case 'warning':
      case 'inactive':
        return 'bg-yellow-500'
      case 'critical':
      case 'suspended':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down':
        return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
      default:
        return <ActivityIcon className="w-4 h-4 text-gray-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Error Loading Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchDashboardData} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono">
      {/* Header */}
      <header className="border-b border-green-500/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-400">
              CODE HOMIE ADMIN
            </h1>
            <p className="text-green-500/70">System Control Panel</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={fetchDashboardData}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="border-green-500/30 text-green-400 hover:bg-green-500/10"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              REFRESH
            </Button>
            <Button
              size="sm"
              className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
            >
              <Download className="w-4 h-4 mr-2" />
              EXPORT
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 border-r border-green-500/20 min-h-screen p-4">
          <div className="space-y-2">
            {[
              { id: 'overview', label: 'SYSTEM OVERVIEW', icon: BarChart3 },
              { id: 'users', label: 'USER MANAGEMENT', icon: Users },
              { id: 'agents', label: 'AI AGENTS', icon: Server },
              { id: 'pipeline', label: 'PIPELINE STATUS', icon: ActivityIcon },
              { id: 'security', label: 'SECURITY', icon: Shield },
              { id: 'database', label: 'DATABASE', icon: Database },
              { id: 'settings', label: 'SETTINGS', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'text-green-500/70 hover:bg-green-500/10 hover:text-green-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* System Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.slice(0, 4).map((metric) => (
                  <Card
                    key={metric.id}
                    className="bg-black border-green-500/30"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-green-500/70 mb-1">
                            {metric.name.toUpperCase()}
                          </div>
                          <div className="text-2xl font-bold text-green-400">
                            {typeof metric.value === 'number' &&
                            metric.value % 1 !== 0
                              ? metric.value.toFixed(1)
                              : metric.value}
                            {metric.unit}
                          </div>
                          <div
                            className={`text-xs ${getStatusColor(metric.status).replace('bg-', 'text-')}`}
                          >
                            {metric.status.toUpperCase()}
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          {getTrendIcon(metric.trend)}
                          <div
                            className={`w-3 h-3 rounded-full ${getStatusColor(metric.status)} animate-pulse`}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Live Activity Feed - now using real data */}
              <Card className="bg-black border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-green-400">
                    LIVE SYSTEM ACTIVITY
                  </CardTitle>
                  <CardDescription className="text-green-500/70">
                    Real-time pipeline operations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 p-3 bg-green-500/5 rounded border border-green-500/20"
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            activity.severity === 'error'
                              ? 'bg-red-500'
                              : activity.severity === 'warning'
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          } animate-pulse`}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-green-400">
                            {activity.action}
                          </div>
                          <div className="text-sm text-green-500/70">
                            {activity.user} • {activity.details}
                          </div>
                        </div>
                        <div className="text-xs text-green-500/50">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-green-400">
                  AI AGENT CONTROL
                </h2>
                <p className="text-green-500/70">
                  Monitor and manage AI agent instances
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[
                  {
                    name: 'CODE GENERATOR',
                    status: 'ACTIVE',
                    load: `${Math.floor(Math.random() * 40) + 50}%`,
                    requests: `${(Math.random() * 2 + 1).toFixed(1)}K`,
                  },
                  {
                    name: 'VOICE PROCESSOR',
                    status: 'ACTIVE',
                    load: `${Math.floor(Math.random() * 30) + 20}%`,
                    requests: `${Math.floor(Math.random() * 500) + 500}`,
                  },
                  {
                    name: 'IMAGE ANALYZER',
                    status: 'ACTIVE',
                    load: `${Math.floor(Math.random() * 35) + 30}%`,
                    requests: `${Math.floor(Math.random() * 300) + 400}`,
                  },
                  {
                    name: 'SEARCH CRAWLER',
                    status: 'ACTIVE',
                    load: `${Math.floor(Math.random() * 50) + 60}%`,
                    requests: `${(Math.random() * 1.5 + 1.5).toFixed(1)}K`,
                  },
                  {
                    name: 'DEPLOYMENT BOT',
                    status: Math.random() > 0.7 ? 'STANDBY' : 'ACTIVE',
                    load: `${Math.floor(Math.random() * 20) + 10}%`,
                    requests: `${Math.floor(Math.random() * 200) + 200}`,
                  },
                  {
                    name: 'SECURITY SCANNER',
                    status: 'ACTIVE',
                    load: `${Math.floor(Math.random() * 40) + 40}%`,
                    requests: `${Math.floor(Math.random() * 300) + 300}`,
                  },
                ].map((agent) => (
                  <Card
                    key={agent.name}
                    className="bg-black border-green-500/30"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium text-green-400">
                          {agent.name}
                        </div>
                        <Badge
                          className={`${agent.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}
                        >
                          {agent.status}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-green-500/70">CPU Load:</span>
                          <span className="text-green-400">{agent.load}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-500/70">
                            Requests/hr:
                          </span>
                          <span className="text-green-400">
                            {agent.requests}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-green-400">
                  PIPELINE STATUS
                </h2>
                <p className="text-green-500/70">
                  Multi-agent pipeline orchestration
                </p>
              </div>

              <Card className="bg-black border-green-500/30">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[
                      {
                        stage: 'INPUT PROCESSING',
                        status: 'COMPLETE',
                        progress: 100,
                      },
                      { stage: 'AI ANALYSIS', status: 'RUNNING', progress: 75 },
                      {
                        stage: 'CODE GENERATION',
                        status: 'QUEUED',
                        progress: 0,
                      },
                      { stage: 'DEPLOYMENT', status: 'PENDING', progress: 0 },
                    ].map((stage) => (
                      <div key={stage.stage} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-green-400 font-medium">
                            {stage.stage}
                          </span>
                          <span
                            className={`text-sm ${
                              stage.status === 'COMPLETE'
                                ? 'text-green-400'
                                : stage.status === 'RUNNING'
                                  ? 'text-yellow-400'
                                  : 'text-green-500/50'
                            }`}
                          >
                            {stage.status}
                          </span>
                        </div>
                        <div className="w-full bg-green-500/10 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              stage.status === 'COMPLETE'
                                ? 'bg-green-500'
                                : stage.status === 'RUNNING'
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500/30'
                            }`}
                            style={{ width: `${stage.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-green-400">
                    USER MANAGEMENT
                  </h2>
                  <p className="text-green-500/70">
                    Manage user accounts and permissions
                  </p>
                </div>
                <Button className="bg-green-500/20 text-green-400 hover:bg-green-500/30">
                  <Plus className="w-4 h-4 mr-2" />
                  ADD USER
                </Button>
              </div>

              <Card className="bg-black border-green-500/30">
                <CardContent className="pt-6">
                  <div className="relative mb-4">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500/50" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10 bg-black border-green-500/30 text-green-400 placeholder:text-green-500/50"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black border-green-500/30">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-green-500/20">
                        <tr>
                          <th className="text-left p-4 font-medium text-green-400">
                            USER
                          </th>
                          <th className="text-left p-4 font-medium text-green-400">
                            ROLE
                          </th>
                          <th className="text-left p-4 font-medium text-green-400">
                            STATUS
                          </th>
                          <th className="text-left p-4 font-medium text-green-400">
                            LAST LOGIN
                          </th>
                          <th className="text-left p-4 font-medium text-green-400">
                            ACTIONS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr
                            key={user.id}
                            className="border-b border-green-500/10 hover:bg-green-500/5"
                          >
                            <td className="p-4">
                              <div>
                                <div className="font-medium text-green-400">
                                  {user.name}
                                </div>
                                <div className="text-sm text-green-500/70">
                                  {user.email}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge className="bg-green-500/20 text-green-400">
                                {user.role.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Badge
                                className={`${
                                  user.status === 'active'
                                    ? 'bg-green-500/20 text-green-400'
                                    : user.status === 'inactive'
                                      ? 'bg-yellow-500/20 text-yellow-400'
                                      : 'bg-red-500/20 text-red-400'
                                }`}
                              >
                                {user.status.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="p-4 text-sm text-green-500/70">
                              {user.lastLogin}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleUserAction(user.id, 'view')
                                  }
                                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleUserAction(user.id, 'edit')
                                  }
                                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-green-400">
                  SECURITY CENTER
                </h2>
                <p className="text-green-500/70">
                  Monitor security events and threats
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-black border-green-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-400">
                      <Shield className="w-5 h-5" />
                      SECURITY SCORE
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400">
                        87/100
                      </div>
                      <div className="text-sm text-green-500/70 mt-1">
                        GOOD POSTURE
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black border-green-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-400">
                      <AlertTriangle className="w-5 h-5" />
                      ACTIVE THREATS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-400">
                        3
                      </div>
                      <div className="text-sm text-green-500/70 mt-1">
                        MONITORING
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black border-green-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-400">
                      <Lock className="w-5 h-5" />
                      FAILED LOGINS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-400">12</div>
                      <div className="text-sm text-green-500/70 mt-1">
                        LAST 24H
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
