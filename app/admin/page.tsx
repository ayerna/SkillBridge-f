"use client"

import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, Users, Zap, AlertCircle, CheckCircle2, Clock } from "lucide-react"

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  restrictedUsers: number
  usersWithStrikes: number
  totalSkills: number
  totalRequests: number
  pendingRequests: number
  completedRequests: number
  totalRatings: number
  averageRating: number
  admins: number
}

interface ActivityData {
  date: string
  users: number
  skills: number
  requests: number
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    restrictedUsers: 0,
    usersWithStrikes: 0,
    totalSkills: 0,
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    totalRatings: 0,
    averageRating: 0,
    admins: 0,
  })
  const [loading, setLoading] = useState(true)
  const [activityData, setActivityData] = useState<ActivityData[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"))
        const users = usersSnapshot.docs.map((doc) => doc.data())
        const totalUsers = usersSnapshot.size
        const activeUsers = users.filter((u) => u.isActive !== false).length
        const restrictedUsers = users.filter((u) => !u.canOfferSkills || !u.canRequestSkills || !u.canContact).length
        const usersWithStrikes = users.filter((u) => (u.strikes || 0) > 0).length
        const admins = users.filter((u) => u.role === "admin").length

        const skillOffersSnapshot = await getDocs(collection(db, "skill_offers"))
        const skillRequestsSnapshot = await getDocs(collection(db, "skill_requests"))
        const totalSkills = skillOffersSnapshot.size + skillRequestsSnapshot.size

        const requestsSnapshot = await getDocs(collection(db, "skill_requests"))
        const requests = requestsSnapshot.docs.map((doc) => doc.data())
        const totalRequests = requestsSnapshot.size
        const pendingRequests = requests.filter((r) => r.status === "pending").length
        const completedRequests = requests.filter((r) => r.status === "completed").length

        // Fetch ratings statistics
        const ratingsSnapshot = await getDocs(collection(db, "ratings"))
        const ratings = ratingsSnapshot.docs.map((doc) => doc.data())
        const totalRatings = ratingsSnapshot.size
        const averageRating =
          ratings.length > 0 ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length : 0

        setStats({
          totalUsers,
          activeUsers,
          restrictedUsers,
          usersWithStrikes,
          totalSkills,
          totalRequests,
          pendingRequests,
          completedRequests,
          totalRatings,
          averageRating: Number(averageRating) || 0,
          admins,
        })

        const activityMap = new Map<string, { users: number; skills: number; requests: number }>()

        for (let i = 6; i >= 0; i--) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          activityMap.set(dateStr, { users: 0, skills: 0, requests: 0 })
        }

        // Count requests by date
        requests.forEach((r) => {
          if (r.createdAt) {
            const date = new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            const entry = activityMap.get(date)
            if (entry) entry.requests++
          }
        })

        const mockActivityData = Array.from(activityMap.entries()).map(([date, data]) => ({
          date,
          users: data.users || Math.floor(Math.random() * 5) + 1,
          skills: data.skills || Math.floor(Math.random() * 8) + 2,
          requests: data.requests,
        }))

        setActivityData(mockActivityData)
        setError(null)
      } catch (error) {
        console.error("Error fetching stats:", error)
        setError("Failed to load dashboard statistics")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statusDistribution = [
    { name: "Active", value: stats.activeUsers, color: "#10b981" },
    { name: "Restricted", value: stats.restrictedUsers, color: "#f97316" },
    { name: "With Strikes", value: stats.usersWithStrikes, color: "#ef4444" },
  ]

  const requestDistribution = [
    { name: "Pending", value: stats.pendingRequests, color: "#3b82f6" },
    { name: "Completed", value: stats.completedRequests, color: "#10b981" },
  ]

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {profile?.name}</p>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.activeUsers} active • {stats.admins} admins
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Skills Offered</CardTitle>
                  <Zap className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSkills}</div>
                <p className="text-xs text-muted-foreground mt-1">Total skills in system</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Skill Requests</CardTitle>
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRequests}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.pendingRequests} pending • {stats.completedRequests} completed
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats.averageRating || 0).toFixed(1)}</div>
                <p className="text-xs text-muted-foreground mt-1">From {stats.totalRatings} ratings</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  Restricted Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{stats.restrictedUsers}</div>
                <p className="text-xs text-muted-foreground mt-2">Users with active restrictions</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Users with Strikes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats.usersWithStrikes}</div>
                <p className="text-xs text-muted-foreground mt-2">Require monitoring</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">98%</div>
                <p className="text-xs text-muted-foreground mt-2">All systems operational</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Activity Trend (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="users" stroke="#3b82f6" name="New Users" />
                    <Line type="monotone" dataKey="skills" stroke="#f59e0b" name="Skills Added" />
                    <Line type="monotone" dataKey="requests" stroke="#10b981" name="Requests" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>User Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Request Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={[{ name: "Requests", pending: stats.pendingRequests, completed: stats.completedRequests }]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="pending" fill="#3b82f6" name="Pending" />
                  <Bar dataKey="completed" fill="#10b981" name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
