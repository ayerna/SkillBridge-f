"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Search, Shield, Trash2 } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  department: string
  year: string
  rating: number
  totalRatings: number
  skillContributions: number
  role?: string
  status?: string
  createdAt: string
  strikes?: number
  canOfferSkills?: boolean
  canRequestSkills?: boolean
  canContact?: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "restricted" | "admin">("all")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [strikeDialogOpen, setStrikeDialogOpen] = useState(false)
  const [strikeReason, setStrikeReason] = useState("")

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersList: User[] = []

        usersSnapshot.forEach((doc) => {
          usersList.push({
            id: doc.id,
            ...doc.data(),
          } as User)
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

      const newStrikeCount = (user.strikes || 0) + 1

      if (newStrikeCount >= 3) {
        // Auto-remove user after 3 strikes
        await deleteDoc(doc(db, "users", userId))
        await addDoc(collection(db, "notifications"), {
          userId,
          type: "account_removed",
          title: "Account Removed",
          message: "Your account has been removed due to 3 strikes. Please contact support.",
          createdAt: new Date().toISOString(),
          read: false,
        })
        setUsers(users.filter((u) => u.id !== userId))
      } else {
        await updateDoc(doc(db, "users", userId), {
          strikes: newStrikeCount,
        })
        await addDoc(collection(db, "notifications"), {
          userId,
          type: "strike_added",
          title: "Strike Added",
          message: `You received a strike. Reason: ${strikeReason}. You have ${newStrikeCount}/3 strikes.`,
          createdAt: new Date().toISOString(),
          read: false,
        })
        setUsers(users.map((u) => (u.id === userId ? { ...u, strikes: newStrikeCount } : u)))
      }

      setStrikeReason("")
      setSelectedUserId(null)
      setStrikeDialogOpen(false)
    } catch (error) {
      console.error("Error adding strike:", error)
    }
  }

  const handleToggleRestriction = async (
    userId: string,
    restrictionType: "canOfferSkills" | "canRequestSkills" | "canContact",
  ) => {
    try {
      const user = users.find((u) => u.id === userId)
      if (!user) return

      const currentValue = user[restrictionType]
      const newValue = currentValue === false ? true : false

      await updateDoc(doc(db, "users", userId), {
        [restrictionType]: newValue,
      })

      const restrictionLabel = {
        canOfferSkills: "offer skills",
        canRequestSkills: "request skills",
        canContact: "contact other users",
      }[restrictionType]

      await addDoc(collection(db, "notifications"), {
        userId,
        type: "restriction_changed",
        title: "Account Restriction Updated",
        message: `Your ability to ${restrictionLabel} has been ${newValue ? "restored" : "restricted"}.`,
        createdAt: new Date().toISOString(),
        read: false,
      })

      setUsers(users.map((u) => (u.id === userId ? { ...u, [restrictionType]: newValue } : u)))
    } catch (error) {
      console.error("Error updating restriction:", error)
    }
  }

  const handleMakeAdmin = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { role: "admin" })
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: "admin" } : u)))
    } catch (error) {
      console.error("Error updating user role:", error)
    }
  }

  const handleRemoveAdmin = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { role: "user" })
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: "user" } : u)))
    } catch (error) {
      console.error("Error updating user role:", error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, "users", userId))
      setUsers(users.filter((u) => u.id !== userId))
    } catch (error) {
      console.error("Error deleting user:", error)
    }
  }

  const handleBulkDelete = async () => {
    try {
      for (const userId of selectedUsers) {
        await deleteDoc(doc(db, "users", userId))
      }
      setUsers(users.filter((u) => !selectedUsers.has(u.id)))
      setSelectedUsers(new Set())
    } catch (error) {
      console.error("Error bulk deleting users:", error)
    }
  }

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const toggleAllSelection = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)))
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())

    if (filterStatus === "all") return matchesSearch
    if (filterStatus === "admin") return matchesSearch && user.role === "admin"
    if (filterStatus === "restricted")
      return matchesSearch && (!user.canOfferSkills || !user.canRequestSkills || !user.canContact)
    return matchesSearch
  })

  const isUserRestricted = (user: User) => !user.canOfferSkills || !user.canRequestSkills || !user.canContact

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage users, restrictions, and strikes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{users.filter((u) => u.role === "admin").length}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{users.filter(isUserRestricted).length}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">With Strikes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{users.filter((u) => (u.strikes || 0) > 0).length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Users</option>
              <option value="admin">Admins</option>
              <option value="restricted">Restricted</option>
            </select>
          </div>

          {selectedUsers.size > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">{selectedUsers.size} users selected</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    Delete Selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogTitle>Delete Users</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedUsers.size} users? This cannot be undone.
                  </AlertDialogDescription>
                  <div className="flex gap-2 justify-end">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBulkDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                        onChange={toggleAllSelection}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Strikes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox checked={selectedUsers.has(user.id)} onChange={() => toggleUserSelection(user.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {(user.rating || 0).toFixed(1)} ({user.totalRatings || 0})
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.strikes && user.strikes > 0 ? (
                          <Badge variant={user.strikes >= 2 ? "destructive" : "secondary"}>{user.strikes}/3</Badge>
                        ) : (
                          <Badge variant="outline">0/3</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.role === "admin" && <Badge className="bg-blue-600">Admin</Badge>}
                          {isUserRestricted(user) && <Badge variant="destructive">Restricted</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Shield className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Manage {user.name}</DialogTitle>
                                <DialogDescription>Restrictions and strikes</DialogDescription>
                              </DialogHeader>
                              <Tabs defaultValue="restrictions" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                  <TabsTrigger value="restrictions">Restrictions</TabsTrigger>
                                  <TabsTrigger value="strikes">Strikes</TabsTrigger>
                                </TabsList>
                                <TabsContent value="restrictions" className="space-y-4">
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                      <span className="text-sm font-medium">Can Offer Skills</span>
                                      <Checkbox
                                        checked={user.canOfferSkills !== false}
                                        onChange={() => handleToggleRestriction(user.id, "canOfferSkills")}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                      <span className="text-sm font-medium">Can Request Skills</span>
                                      <Checkbox
                                        checked={user.canRequestSkills !== false}
                                        onChange={() => handleToggleRestriction(user.id, "canRequestSkills")}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                      <span className="text-sm font-medium">Can Contact Users</span>
                                      <Checkbox
                                        checked={user.canContact !== false}
                                        onChange={() => handleToggleRestriction(user.id, "canContact")}
                                      />
                                    </div>
                                  </div>
                                </TabsContent>
                                <TabsContent value="strikes" className="space-y-4">
                                  <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm font-medium mb-2">Current Strikes: {user.strikes || 0}/3</p>
                                    <div className="flex gap-1">
                                      {Array.from({ length: 3 }).map((_, i) => (
                                        <div
                                          key={i}
                                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                            i < (user.strikes || 0) ? "bg-red-500 text-white" : "bg-gray-200"
                                          }`}
                                        >
                                          {i + 1}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {(user.strikes || 0) < 3 && (
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Reason for Strike</label>
                                      <Textarea
                                        value={selectedUserId === user.id ? strikeReason : ""}
                                        onChange={(e) => setStrikeReason(e.target.value)}
                                        placeholder="Enter reason..."
                                        rows={3}
                                      />
                                      <Button
                                        onClick={() => {
                                          setSelectedUserId(user.id)
                                          handleAddStrike(user.id)
                                        }}
                                        className="w-full bg-red-600 hover:bg-red-700"
                                      >
                                        Add Strike
                                      </Button>
                                    </div>
                                  )}
                                </TabsContent>
                              </Tabs>
                            </DialogContent>
                          </Dialog>

                          {user.role !== "admin" ? (
                            <Button size="sm" variant="outline" onClick={() => handleMakeAdmin(user.id)}>
                              Make Admin
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleRemoveAdmin(user.id)}>
                              Remove Admin
                            </Button>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {user.name}? This cannot be undone.
                              </AlertDialogDescription>
                              <div className="flex gap-2 justify-end">
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
