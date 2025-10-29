"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface AppSettings {
  maintenanceMode: boolean
  emailNotifications: boolean
  autoApproveSkills: boolean
  twoFactorEnforced: boolean
}

interface Analytics {
  activeUsers: number
  totalSkills: number
  totalRequests: number
  completedRequests: number
  averageRating: number
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    maintenanceMode: false,
    emailNotifications: true,
    autoApproveSkills: false,
    twoFactorEnforced: false,
  })
  const [analytics, setAnalytics] = useState<Analytics>({
    activeUsers: 0,
    totalSkills: 0,
    totalRequests: 0,
    completedRequests: 0,
    averageRating: 0,
  })
  const [broadcastMessage, setBroadcastMessage] = useState("")
  const [broadcastTitle, setBroadcastTitle] = useState("")
  const [saveStatus, setSaveStatus] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Fetch settings
        const settingsDoc = await getDoc(doc(db, "admin", "settings"))
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as AppSettings)
        }

        // Fetch analytics
        const usersSnapshot = await getDocs(collection(db, "users"))
        const skillsSnapshot = await getDocs(collection(db, "skills"))
        const requestsSnapshot = await getDocs(collection(db, "skillRequests"))

        let totalRating = 0
        let ratingCount = 0

        usersSnapshot.forEach((doc) => {
          const user = doc.data()
          if (user.rating && typeof user.rating === "number") {
            totalRating += user.rating
            ratingCount++
          }
        })

        const completedRequests = Array.from(requestsSnapshot.docs).filter(
          (doc) => doc.data().status === "completed",
        ).length

        setAnalytics({
          activeUsers: usersSnapshot.size,
          totalSkills: skillsSnapshot.size,
          totalRequests: requestsSnapshot.size,
          completedRequests,
          averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
        })
      } catch (error) {
        console.error("Error fetching settings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleToggle = async (key: keyof AppSettings) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key],
    }
    setSettings(newSettings)

    try {
      await setDoc(doc(db, "admin", "settings"), newSettings)
      setSaveStatus("Settings saved successfully")
      setTimeout(() => setSaveStatus(""), 3000)
    } catch (error) {
      console.error("Error saving settings:", error)
      setSaveStatus("Error saving settings")
    }
  }

  const handleBroadcastMessage = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setSaveStatus("Please fill in both title and message")
      setTimeout(() => setSaveStatus(""), 3000)
      return
    }

    try {
      await setDoc(doc(db, "broadcasts", new Date().getTime().toString()), {
        title: broadcastTitle,
        message: broadcastMessage,
        createdAt: new Date().toISOString(),
        createdBy: "admin",
      })

      setSaveStatus("Broadcast message sent to all users")
      setBroadcastTitle("")
      setBroadcastMessage("")
      setTimeout(() => setSaveStatus(""), 3000)
    } catch (error) {
      console.error("Error sending broadcast:", error)
      setSaveStatus("Error sending broadcast")
    }
  }

  const exportDatabase = async () => {
    try {
      const users = await getDocs(collection(db, "users"))
      const skills = await getDocs(collection(db, "skills"))
      const requests = await getDocs(collection(db, "skillRequests"))

      const data = {
        users: users.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        skills: skills.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        requests: requests.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        exportedAt: new Date().toISOString(),
      }

      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `database-backup-${new Date().toISOString().split("T")[0]}.json`
      a.click()
    } catch (error) {
      console.error("Error exporting database:", error)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Settings & Monitoring</h1>
        <p className="text-muted-foreground">Configure system-wide settings and monitor app analytics</p>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSkills}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completedRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Added fallback to prevent toFixed error */}
            <div className="text-2xl font-bold">{(analytics.averageRating || 0).toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 max-w-4xl">
        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Maintenance Mode</p>
                <p className="text-sm text-muted-foreground">Disable access for regular users during maintenance</p>
              </div>
              <Button
                variant={settings.maintenanceMode ? "default" : "outline"}
                onClick={() => handleToggle("maintenanceMode")}
              >
                {settings.maintenanceMode ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Send email notifications for moderation actions</p>
                </div>
                <Button
                  variant={settings.emailNotifications ? "default" : "outline"}
                  onClick={() => handleToggle("emailNotifications")}
                >
                  {settings.emailNotifications ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-Approve Skills</p>
                  <p className="text-sm text-muted-foreground">Automatically approve new skills without review</p>
                </div>
                <Button
                  variant={settings.autoApproveSkills ? "default" : "outline"}
                  onClick={() => handleToggle("autoApproveSkills")}
                >
                  {settings.autoApproveSkills ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enforce 2FA for Admins</p>
                  <p className="text-sm text-muted-foreground">Require two-factor authentication for admin accounts</p>
                </div>
                <Button
                  variant={settings.twoFactorEnforced ? "default" : "outline"}
                  onClick={() => handleToggle("twoFactorEnforced")}
                >
                  {settings.twoFactorEnforced ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </div>

            {saveStatus && <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm">{saveStatus}</div>}
          </CardContent>
        </Card>

        {/* Broadcast Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Broadcast Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Send system-wide messages to all users</p>
            <Input
              placeholder="Message title"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
            />
            <Textarea
              placeholder="Message content"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              className="min-h-24"
            />
            <Button onClick={handleBroadcastMessage} className="w-full">
              Send Broadcast
            </Button>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full bg-transparent" onClick={exportDatabase}>
              Export Database as JSON
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  Clear All Cache
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogTitle>Clear Cache</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to clear all cache? This action cannot be undone.
                </AlertDialogDescription>
                <div className="flex gap-2 justify-end">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Clear Cache
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
