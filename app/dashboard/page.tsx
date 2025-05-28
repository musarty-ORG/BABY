"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"
import { CreditCard, DollarSign, Users, BarChart, Clock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

export default function DashboardPage() {
  const { user, token } = useAuth()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const success = searchParams?.get("success")
  const plan = searchParams?.get("plan")
  const messages = searchParams?.get("messages")

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/user/dashboard-enhanced", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data")
        }

        const data = await response.json()
        setDashboardData(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchDashboardData()
    }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 text-green-500 animate-spin mb-4" />
        <h2 className="text-xl text-green-400">Loading your dashboard...</h2>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          onClick={() => window.location.reload()}
          className="mt-4 bg-green-500/20 text-green-400 hover:bg-green-500/30"
        >
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-green-400 p-4 md:p-8">
      {success && (
        <Alert className="mb-6 border-green-500/30 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-400">
            {success === "subscription_activated" ? "🎉 Subscription activated successfully!" : "💰 Top-up successful!"}
          </AlertTitle>
          <AlertDescription className="text-green-400/80">
            {success === "subscription_activated"
              ? `Welcome to ${plan || "your new"} plan.`
              : `${messages || "Additional"} messages added to your account.`}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-green-400">Dashboard</h1>
          <p className="text-green-500/70">Welcome back, {user?.name || "Hacker"}!</p>
        </div>
        <Button className="mt-4 md:mt-0 bg-green-500/20 text-green-400 hover:bg-green-500/30">Buy More Tokens</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="bg-black border-green-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-400">Total Tokens</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{dashboardData?.tokens?.total_balance || 0}</div>
            <p className="text-xs text-green-500/70">
              {dashboardData?.tokens?.monthly_balance || 0} monthly + {dashboardData?.tokens?.topup_balance || 0}{" "}
              purchased
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black border-green-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-400">Current Plan</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{dashboardData?.tokens?.plan || "Free"}</div>
            <p className="text-xs text-green-500/70">
              {dashboardData?.subscription ? "Active subscription" : "No active subscription"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black border-green-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-400">API Calls</CardTitle>
            <BarChart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{dashboardData?.usage_stats?.total_api_calls || 0}</div>
            <p className="text-xs text-green-500/70">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-black border-green-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-400">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {dashboardData?.usage_stats?.avg_response_time || 0}ms
            </div>
            <p className="text-xs text-green-500/70">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-black border border-green-500/30 mb-8">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="tokens"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            Tokens
          </TabsTrigger>
          <TabsTrigger
            value="payment-methods"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            Payment Methods
          </TabsTrigger>
          <TabsTrigger
            value="subscription"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            Subscription
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-black border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-400">Token Usage</CardTitle>
                <CardDescription className="text-green-500/70">Your recent token consumption</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.token_history?.length > 0 ? (
                  <ul className="space-y-4">
                    {dashboardData.token_history.slice(0, 5).map((entry: any) => (
                      <li
                        key={entry.id}
                        className="flex justify-between items-center border-b border-green-500/10 pb-2"
                      >
                        <div>
                          <p className="text-green-400">{entry.reason}</p>
                          <p className="text-xs text-green-500/70">{new Date(entry.created_at).toLocaleString()}</p>
                        </div>
                        <span className={entry.delta > 0 ? "text-green-400" : "text-red-400"}>
                          {entry.delta > 0 ? "+" : ""}
                          {entry.delta}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-green-500/70">No token history available</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-black border-green-500/30">
              <CardHeader>
                <CardTitle className="text-green-400">Payment Methods</CardTitle>
                <CardDescription className="text-green-500/70">Your saved payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.payment_methods?.length > 0 ? (
                  <ul className="space-y-4">
                    {dashboardData.payment_methods.map((method: any) => (
                      <li
                        key={method.id}
                        className="flex justify-between items-center border-b border-green-500/10 pb-2"
                      >
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2 text-green-500" />
                          <div>
                            <p className="text-green-400">
                              {method.brand || "Card"} •••• {method.last_digits || "****"}
                              {method.is_default && (
                                <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                                  Default
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-green-500/70">Expires: {method.expiry || "N/A"}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-green-500/70 mb-4">No payment methods saved</p>
                    <Button className="bg-green-500/20 text-green-400 hover:bg-green-500/30">Add Payment Method</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tokens">
          <Card className="bg-black border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400">Token Management</CardTitle>
              <CardDescription className="text-green-500/70">View and manage your token balance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-green-500/10 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-green-500/70 mb-1">Monthly Tokens</h3>
                    <p className="text-2xl font-bold text-green-400">{dashboardData?.tokens?.monthly_balance || 0}</p>
                    <p className="text-xs text-green-500/70 mt-1">Resets monthly</p>
                  </div>

                  <div className="bg-green-500/10 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-green-500/70 mb-1">Purchased Tokens</h3>
                    <p className="text-2xl font-bold text-green-400">{dashboardData?.tokens?.topup_balance || 0}</p>
                    <p className="text-xs text-green-500/70 mt-1">Never expire</p>
                  </div>

                  <div className="bg-green-500/10 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-green-500/70 mb-1">Total Balance</h3>
                    <p className="text-2xl font-bold text-green-400">{dashboardData?.tokens?.total_balance || 0}</p>
                    <p className="text-xs text-green-500/70 mt-1">Available for use</p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button className="bg-green-500/20 text-green-400 hover:bg-green-500/30">Purchase More Tokens</Button>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-green-400 mb-4">Token History</h3>
                  {dashboardData?.token_history?.length > 0 ? (
                    <div className="border border-green-500/30 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-green-500/10">
                            <th className="text-left p-3 text-green-400">Date</th>
                            <th className="text-left p-3 text-green-400">Description</th>
                            <th className="text-right p-3 text-green-400">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.token_history.map((entry: any, index: number) => (
                            <tr key={entry.id} className={index % 2 === 0 ? "bg-green-500/5" : ""}>
                              <td className="p-3 text-green-500/70">
                                {new Date(entry.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-3 text-green-400">{entry.reason}</td>
                              <td className={`p-3 text-right ${entry.delta > 0 ? "text-green-400" : "text-red-400"}`}>
                                {entry.delta > 0 ? "+" : ""}
                                {entry.delta}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-green-500/70 text-center py-8">No token history available</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-methods">
          <Card className="bg-black border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400">Payment Methods</CardTitle>
              <CardDescription className="text-green-500/70">Manage your saved payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData?.payment_methods?.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    {dashboardData.payment_methods.map((method: any) => (
                      <div key={method.id} className="border border-green-500/30 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center">
                            <CreditCard className="h-5 w-5 mr-2 text-green-500" />
                            <div>
                              <p className="text-green-400 font-medium">
                                {method.brand || "Card"} •••• {method.last_digits || "****"}
                              </p>
                              <p className="text-xs text-green-500/70">Expires: {method.expiry || "N/A"}</p>
                            </div>
                          </div>
                          {method.is_default && (
                            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded">Default</span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {!method.is_default && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                            >
                              Set as Default
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center">
                    <Button className="bg-green-500/20 text-green-400 hover:bg-green-500/30">
                      Add New Payment Method
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-green-500/70 mb-4">You don't have any saved payment methods</p>
                  <Button className="bg-green-500/20 text-green-400 hover:bg-green-500/30">Add Payment Method</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <Card className="bg-black border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400">Subscription Details</CardTitle>
              <CardDescription className="text-green-500/70">Manage your subscription plan</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData?.subscription ? (
                <div className="space-y-6">
                  <div className="bg-green-500/10 p-6 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-green-400">
                          {dashboardData.subscription.plan || "Basic"} Plan
                        </h3>
                        <p className="text-green-500/70">
                          Status: <span className="text-green-400">{dashboardData.subscription.status}</span>
                        </p>
                        {dashboardData.subscription.next_billing_date && (
                          <p className="text-green-500/70 mt-1">
                            Next billing date:{" "}
                            {new Date(dashboardData.subscription.next_billing_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">Active</span>
                    </div>
                  </div>

                  <div className="flex justify-center space-x-4">
                    <Button variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
                      Change Plan
                    </Button>
                    <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                      Cancel Subscription
                    </Button>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-green-400 mb-4">Plan Benefits</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center text-green-400">
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                        {dashboardData.tokens?.monthly_balance || 1000} tokens per month
                      </li>
                      <li className="flex items-center text-green-400">
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                        Priority API access
                      </li>
                      <li className="flex items-center text-green-400">
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                        Advanced features
                      </li>
                      <li className="flex items-center text-green-400">
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                        Email support
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-green-500/70 mb-4">You don't have an active subscription</p>
                  <Button className="bg-green-500/20 text-green-400 hover:bg-green-500/30">View Plans</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="bg-black border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400">Recent Activity</CardTitle>
              <CardDescription className="text-green-500/70">
                Your recent API calls and system interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData?.recent_activity?.length > 0 ? (
                <div className="border border-green-500/30 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-green-500/10">
                        <th className="text-left p-3 text-green-400">Time</th>
                        <th className="text-left p-3 text-green-400">Endpoint</th>
                        <th className="text-left p-3 text-green-400">Method</th>
                        <th className="text-right p-3 text-green-400">Status</th>
                        <th className="text-right p-3 text-green-400">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.recent_activity.map((activity: any, index: number) => (
                        <tr key={activity.id} className={index % 2 === 0 ? "bg-green-500/5" : ""}>
                          <td className="p-3 text-green-500/70">{new Date(activity.timestamp).toLocaleTimeString()}</td>
                          <td className="p-3 text-green-400">{activity.endpoint.split("/").slice(-2).join("/")}</td>
                          <td className="p-3 text-green-400">{activity.method}</td>
                          <td className="p-3 text-right">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                activity.status_code < 300
                                  ? "bg-green-500/20 text-green-400"
                                  : activity.status_code < 400
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {activity.status_code}
                            </span>
                          </td>
                          <td className="p-3 text-right text-green-400">{activity.duration}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-green-500/70 text-center py-8">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
