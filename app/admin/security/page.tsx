"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  twoFactorEnabled: boolean
  lastLogin: string
  loginAttempts: number
  createdAt: string
}

export default function SecurityPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setError(null)
        console.log("[v0] Fetching admin users...")

        const usersSnapshot = await getDocs(collection(db, "users"))
        const adminsList: AdminUser[] = []

        usersSnapshot.forEach((doc) => {
          const user = doc.data()
          if (user.role === "admin") {
            adminsList.push({
              id: doc.id,
              name: user.name || "Unknown Admin",
              email: user.email || "No email",
              role: user.role,
              twoFactorEnabled: user.twoFactorEnabled || false,
              lastLogin: user.lastLogin || "Never",
              loginAttempts: user.loginAttempts || 0,
              createdAt: user.createdAt || new Date().toISOString(),
            })
          }
        })

        console.log("[v0] Fetched admin users:", adminsList.length)
        setAdmins(adminsList)
      } catch (error) {
        console.error("[v0] Error fetching admins:", error)
        setError(`Failed to fetch admin accounts: ${error instanceof Error ? error.message : "Unknown error"}`)
      } finally {
        setLoading(false)
      }
    }

    fetchAdmins()
  }, [])

  const handleEnforce2FA = async (adminId: string) => {
    try {
      await updateDoc(doc(db, "users", adminId), {
        twoFactorRequired: true,
      })
      setAdmins(admins.map((a) => (a.id === adminId ? { ...a, twoFactorEnabled: true } : a)))
    } catch (error) {
      console.error("Error enforcing 2FA:", error)
      setError("Failed to enforce 2FA")
    }
  }

  const handleResetLoginAttempts = async (adminId: string) => {
    try {
      await updateDoc(doc(db, "users", adminId), {
        loginAttempts: 0,
      })
      setAdmins(admins.map((a) => (a.id === adminId ? { ...a, loginAttempts: 0 } : a)))
    } catch (error) {
      console.error("Error resetting login attempts:", error)
      setError("Failed to reset login attempts")
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Security & Access Control</h1>
        <p className="text-muted-foreground">Manage admin accounts and security settings</p>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Admin Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p>Loading admin accounts...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>2FA Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Login Attempts</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.name}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Badge variant={admin.twoFactorEnabled ? "default" : "secondary"}>
                          {admin.twoFactorEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{admin.lastLogin}</TableCell>
                      <TableCell>
                        <span className={admin.loginAttempts > 3 ? "text-red-600 font-medium" : ""}>
                          {admin.loginAttempts}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!admin.twoFactorEnabled && (
                            <Button size="sm" variant="outline" onClick={() => handleEnforce2FA(admin.id)}>
                              Enable 2FA
                            </Button>
                          )}

                          {admin.loginAttempts > 0 && (
                            <Button size="sm" variant="outline" onClick={() => handleResetLoginAttempts(admin.id)}>
                              Reset Attempts
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">Total admins: {admins.length}</div>
        </CardContent>
      </Card>
    </div>
  )
}
