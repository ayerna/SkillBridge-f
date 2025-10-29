"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Search, Edit, Trash2, Eye } from "lucide-react"

interface Skill {
  id: string
  userId: string
  userName: string
  userEmail: string
  skillName: string
  description: string
  category: string
  type: "offer" | "request"
  level?: string
  urgency?: string
  availability?: string
  tags?: string[]
  createdAt: string
  status?: string
}

export default function SkillsManagementPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "offer" | "request">("all")
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [editDescription, setEditDescription] = useState("")
  const [viewingSkillId, setViewingSkillId] = useState<string | null>(null)

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        // Fetch offered skills
        const offersSnapshot = await getDocs(collection(db, "skill_offers"))
        const skillsList: Skill[] = []

        offersSnapshot.forEach((doc) => {
          const data = doc.data()
          skillsList.push({
            id: doc.id,
            userId: data.userId,
            userName: data.userName || "Unknown",
            userEmail: data.userEmail || "Unknown",
            skillName: data.skillName,
            description: data.description,
            category: data.category,
            type: "offer",
            level: data.level,
            availability: data.availability,
            tags: data.tags,
            createdAt: data.createdAt,
            status: data.status || "active",
          })
        })

        // Fetch requested skills
        const requestsSnapshot = await getDocs(collection(db, "skill_requests"))
        requestsSnapshot.forEach((doc) => {
          const data = doc.data()
          skillsList.push({
            id: doc.id,
            userId: data.userId || "unknown",
            userName: data.userName || "Unknown",
            userEmail: data.userEmail || "Unknown",
            skillName: data.topic || data.skillName || "Untitled",
            description: data.description || "",
            category: data.category || "Uncategorized",
            type: "request",
            urgency: data.urgency,
            createdAt: data.createdAt || new Date().toISOString(),
            status: data.status || "active",
          })
        })

        // Sort by creation date
        skillsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setSkills(skillsList)
      } catch (error) {
        console.error("Error fetching skills:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSkills()
  }, [])

  const handleEditSkill = async (skill: Skill) => {
    try {
      const collectionName = skill.type === "offer" ? "skill_offers" : "skill_requests"
      await updateDoc(doc(db, collectionName, skill.id), {
        description: editDescription,
      })

      setSkills(skills.map((s) => (s.id === skill.id ? { ...s, description: editDescription } : s)))

      await addDoc(collection(db, "notifications"), {
        userId: skill.userId,
        type: "skill_modified",
        title: "Your Skill Was Modified",
        message: `Admin modified your ${skill.type === "offer" ? "offered" : "requested"} skill: ${skill.skillName}`,
        skillId: skill.id,
        skillType: skill.type,
        createdAt: new Date().toISOString(),
        read: false,
      })

      setEditingSkill(null)
      setEditDescription("")
    } catch (error) {
      console.error("Error updating skill:", error)
    }
  }

  const handleDeleteSkill = async (skill: Skill) => {
    try {
      const collectionName = skill.type === "offer" ? "skill_offers" : "skill_requests"
      await deleteDoc(doc(db, collectionName, skill.id))

      setSkills(skills.filter((s) => s.id !== skill.id))

      await addDoc(collection(db, "notifications"), {
        userId: skill.userId,
        type: "skill_deleted",
        title: "Your Skill Was Deleted",
        message: `Admin deleted your ${skill.type === "offer" ? "offered" : "requested"} skill: ${skill.skillName}`,
        skillId: skill.id,
        skillType: skill.type,
        createdAt: new Date().toISOString(),
        read: false,
      })
    } catch (error) {
      console.error("Error deleting skill:", error)
    }
  }

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch =
      skill.skillName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.userEmail.toLowerCase().includes(searchTerm.toLowerCase())

    if (filterType === "all") return matchesSearch
    return matchesSearch && skill.type === filterType
  })

  const viewingSkill = viewingSkillId ? filteredSkills.find((s) => s.id === viewingSkillId) : null

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Skills Management</h1>
        <p className="text-muted-foreground">Manage all offered and requested skills in the system</p>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>All Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by skill name or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Skills</SelectItem>
                <SelectItem value="offer">Offered Skills</SelectItem>
                <SelectItem value="request">Requested Skills</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading skills...</p>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No skills found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skill Name</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Level/Urgency</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSkills.map((skill) => (
                    <TableRow key={skill.id}>
                      <TableCell className="font-medium">{skill.skillName}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{skill.userName}</p>
                          <p className="text-muted-foreground text-xs">{skill.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={skill.type === "offer" ? "default" : "secondary"}>
                          {skill.type === "offer" ? "Offered" : "Requested"}
                        </Badge>
                      </TableCell>
                      <TableCell>{skill.category}</TableCell>
                      <TableCell>
                        {skill.type === "offer" ? (
                          <Badge variant="outline" className="text-xs">
                            {skill.level || "N/A"}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              skill.urgency === "High"
                                ? "border-red-300 text-red-700"
                                : skill.urgency === "Medium"
                                  ? "border-yellow-300 text-yellow-700"
                                  : "border-green-300 text-green-700"
                            }`}
                          >
                            {skill.urgency || "N/A"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(skill.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog
                            open={viewingSkillId === skill.id}
                            onOpenChange={(open) => !open && setViewingSkillId(null)}
                          >
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setViewingSkillId(skill.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{viewingSkill?.skillName}</DialogTitle>
                                <DialogDescription>
                                  {viewingSkill?.type === "offer" ? "Offered by" : "Requested by"}{" "}
                                  {viewingSkill?.userName}
                                </DialogDescription>
                              </DialogHeader>
                              {viewingSkill && (
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium mb-2">Description</h4>
                                    <p className="text-sm text-muted-foreground">{viewingSkill.description}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium mb-2">Category</h4>
                                      <p className="text-sm">{viewingSkill.category}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">
                                        {viewingSkill.type === "offer" ? "Level" : "Urgency"}
                                      </h4>
                                      <p className="text-sm">{viewingSkill.level || viewingSkill.urgency || "N/A"}</p>
                                    </div>
                                  </div>
                                  {viewingSkill.type === "offer" && viewingSkill.availability && (
                                    <div>
                                      <h4 className="font-medium mb-2">Availability</h4>
                                      <p className="text-sm">{viewingSkill.availability}</p>
                                    </div>
                                  )}
                                  {viewingSkill.tags && viewingSkill.tags.length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-2">Tags</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {viewingSkill.tags.map((tag, idx) => (
                                          <Badge key={idx} variant="outline" className="text-xs">
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingSkill(skill)
                                  setEditDescription(skill.description)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Skill Description</DialogTitle>
                                <DialogDescription>
                                  Modify the description for {editingSkill?.skillName}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Skill Name</label>
                                  <p className="text-sm text-muted-foreground mt-1">{editingSkill?.skillName}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Description</label>
                                  <Textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="mt-1"
                                    rows={4}
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setEditingSkill(null)}>
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => editingSkill && handleEditSkill(editingSkill)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  Save Changes
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogTitle>Delete Skill</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{skill.skillName}"? The user will be notified of this
                                action.
                              </AlertDialogDescription>
                              <div className="flex gap-2 justify-end">
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSkill(skill)}
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
            Showing {filteredSkills.length} of {skills.length} skills
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
