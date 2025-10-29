"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface UserStrike {
  id: string
  name: string
  email: string
  strikes: number
  strikeHistory: Array<{
    date: string
    reason: string
  }>
}

export default function StrikesPage() {
  const [users, setUsers] = useState<UserStrike[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [strikeReason, setStrikeReason] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersList: UserStrike[] = []

        usersSnapshot.forEach((doc) => {
          const data = doc.data()
          usersList.push({
            id: doc.id,
            name: data.name || "Unknown",
            email: data.email || "Unknown",
            strikes: data.strikes || 0,
            strikeHistory: data.strikeHistory || [],
          })
        })

        setUsers(usersList)
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const handleAddStrike = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId)
      if (!user) return

      const newStrikeCount = user.strikes + 1
      const newStrikeHistory = [
        ...(user.strikeHistory || []),
        {
          date: new Date().toISOString(),
          reason: strikeReason,
        },
      ]

      // If 3 strikes, remove user
      if (newStrikeCount >= 3) {
        await deleteDoc(doc(db, "users", userId))

        // Send notification before deletion
        await addDoc(collection(db, "notifications"), {
          userId,
          type: "account_removed",
          title: "Account Removed",
          message: "Your account has been removed due to 3 strikes. Please contact support for more information.",
          createdAt: new Date().toISOString(),
          read: false,
        })

        setUsers(users.filter((u) => u.id !== userId))
      } else {
        await updateDoc(doc(db, "users", userId), {
          strikes: newStrikeCount,
          strikeHistory: newStrikeHistory,
        })

        setUsers(
          users.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  strikes: newStrikeCount,
                  strikeHistory: newStrikeHistory,
                }
              : u,
          ),
        )

        // Send notification to user
        await addDoc(collection(db, "notifications"), {
          userId,
          type: "strike_added",
          title: "Strike Added to Your Account",
          message: `You have received a strike. Reason: ${strikeReason}. You now have ${newStrikeCount} strike(s). After 3 strikes, your account will be removed.`,
          createdAt: new Date().toISOString(),
          read: false,
        })
      }

      setStrikeReason("")
      setSelectedUserId(null)
    } catch (error) {
      console.error("Error adding strike:", error)
    }
  }

  const handleRemoveStrike = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId)
      if (!user || user.strikes === 0) return

      const newStrikeCount = user.strikes - 1
      const newStrikeHistory = (user.strikeHistory || []).slice(0, -1)

      await updateDoc(doc(db, "users", userId), {
        strikes: newStrikeCount,
        strikeHistory: newStrikeHistory,
      })

      setUsers(
        users.map((u) =>
          u.id === userId
            ? {
                ...u,
                strikes: newStrikeCount,
                strikeHistory: newStrikeHistory,
              }
            : u,
        ),
      )

      // Send notification to user
      await addDoc(collection(db, "notifications"), {
        userId,
        type: "strike_removed",
        title: "Strike Removed",
        message: `A strike has been removed from your account. You now have ${newStrikeCount} strike(s).`,
        createdAt: new Date().toISOString(),
        read: false,
      })
    } catch (error) {
      console.error("Error removing strike:", error)
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const usersWithStrikes = filteredUsers.filter((u) => u.strikes > 0)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Strike Management</h1>
        <p className="text-muted-foreground">Manage user strikes (3 strikes = automatic removal)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Users with Strikes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{usersWithStrikes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">At Risk (2+ Strikes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {usersWithStrikes.filter((u) => u.strikes >= 2).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Strikes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p>Loading users...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Strikes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Strike</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                i < user.strikes ? "bg-red-500 text-white" : "bg-gray-200 text-gray-500"
                              }`}
                            >
                              {i + 1}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.strikes === 0 ? (
                          <Badge variant="default">Clean</Badge>
                        ) : user.strikes === 1 ? (
                          <Badge variant="secondary">1 Strike</Badge>
                        ) : user.strikes === 2 ? (
                          <Badge variant="destructive">2 Strikes - At Risk</Badge>
                        ) : (
                          <Badge variant="destructive">3 Strikes - Removed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.strikeHistory.length > 0
                          ? new Date(user.strikeHistory[user.strikeHistory.length - 1].date).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {user.strikes < 3 && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" onClick={() => setSelectedUserId(user.id)}>
                                  Add Strike
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogTitle>Add Strike to {user.name}</AlertDialogTitle>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Reason for Strike</label>
                                    <Textarea
                                      value={strikeReason}
                                      onChange={(e) => setStrikeReason(e.target.value)}
                                      placeholder="Enter the reason for this strike..."
                                      className="mt-1"
                                    />
                                  </div>
                                  <p className="text-sm text-muted-foreground">Current strikes: {user.strikes}/3</p>
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleAddStrike(user.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Add Strike
                                  </AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {user.strikes > 0 && (
                            <Button size="sm" variant="outline" onClick={() => handleRemoveStrike(user.id)}>
                              Remove Strike
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

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
