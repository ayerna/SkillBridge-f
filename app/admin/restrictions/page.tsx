"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, updateDoc, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

interface UserRestriction {
  id: string
  name: string
  email: string
  restrictions: {
    canOfferSkills: boolean
    canRequestSkills: boolean
    canContact: boolean
  }
}

export default function RestrictionsPage() {
  const [users, setUsers] = useState<UserRestriction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersList: UserRestriction[] = []

        usersSnapshot.forEach((doc) => {
          const data = doc.data()
          usersList.push({
            id: doc.id,
            name: data.name || "Unknown",
            email: data.email || "Unknown",
            restrictions: {
              canOfferSkills: data.canOfferSkills !== false,
              canRequestSkills: data.canRequestSkills !== false,
              canContact: data.canContact !== false,
            },
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

  const handleToggleRestriction = async (userId: string, restrictionType: keyof UserRestriction["restrictions"]) => {
    try {
      const user = users.find((u) => u.id === userId)
      if (!user) return

      const newValue = !user.restrictions[restrictionType]
      await updateDoc(doc(db, "users", userId), {
        [restrictionType]: newValue,
      })

      setUsers(
        users.map((u) =>
          u.id === userId
            ? {
                ...u,
                restrictions: {
                  ...u.restrictions,
                  [restrictionType]: newValue,
                },
              }
            : u,
        ),
      )

      // Send notification to user
      const restrictionLabel = {
        canOfferSkills: "offer skills",
        canRequestSkills: "request skills",
        canContact: "contact other users",
      }[restrictionType]

      await addDoc(collection(db, "notifications"), {
        userId,
        type: "restriction_changed",
        title: "Account Restriction Updated",
        message: `Your ability to ${restrictionLabel} has been ${newValue ? "restored" : "restricted"} by admin.`,
        createdAt: new Date().toISOString(),
        read: false,
      })
    } catch (error) {
      console.error("Error updating restriction:", error)
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const restrictedUsers = filteredUsers.filter(
    (u) => !u.restrictions.canOfferSkills || !u.restrictions.canRequestSkills || !u.restrictions.canContact,
  )

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">User Restrictions</h1>
        <p className="text-muted-foreground">Manage user permissions and restrictions</p>
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
            <CardTitle className="text-sm font-medium">Restricted Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{restrictedUsers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unrestricted Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{users.length - restrictedUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Restrictions</CardTitle>
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
                    <TableHead>Can Offer Skills</TableHead>
                    <TableHead>Can Request Skills</TableHead>
                    <TableHead>Can Contact Users</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Checkbox
                          checked={user.restrictions.canOfferSkills}
                          onChange={() => handleToggleRestriction(user.id, "canOfferSkills")}
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={user.restrictions.canRequestSkills}
                          onChange={() => handleToggleRestriction(user.id, "canRequestSkills")}
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={user.restrictions.canContact}
                          onChange={() => handleToggleRestriction(user.id, "canContact")}
                        />
                      </TableCell>
                      <TableCell>
                        {user.restrictions.canOfferSkills &&
                        user.restrictions.canRequestSkills &&
                        user.restrictions.canContact ? (
                          <Badge variant="default">Unrestricted</Badge>
                        ) : (
                          <Badge variant="destructive">Restricted</Badge>
                        )}
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
