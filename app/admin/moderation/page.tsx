"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Skill {
  id: string
  skillName: string
  description: string
  category: string
  userId: string
  userName?: string
  status?: string
  flagged?: boolean
  flagReason?: string
  createdAt: string
}

interface SkillRequest {
  id: string
  topic: string
  userId: string
  userName?: string
  status?: string
  flagged?: boolean
  createdAt: string
}

export default function ModerationPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [requests, setRequests] = useState<SkillRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"skills" | "requests">("skills")
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set())
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set())
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [editDescription, setEditDescription] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)
        console.log("[v0] Starting to fetch moderation data...")

        // Fetch skills from skill_offers collection
        const skillsSnapshot = await getDocs(collection(db, "skill_offers"))
        const skillsList: Skill[] = []

        skillsSnapshot.forEach((doc) => {
          skillsList.push({
            id: doc.id,
            ...doc.data(),
          } as Skill)
        })

        console.log("[v0] Fetched skills:", skillsList.length)

        setSkills(skillsList)

        // Fetch skill requests from skill_requests collection
        const requestsSnapshot = await getDocs(collection(db, "skill_requests"))
        const requestsList: SkillRequest[] = []

        requestsSnapshot.forEach((doc) => {
          requestsList.push({
            id: doc.id,
            ...doc.data(),
          } as SkillRequest)
        })

        console.log("[v0] Fetched requests:", requestsList.length)

        setRequests(requestsList)
      } catch (error) {
        console.error("[v0] Error fetching moderation data:", error)
        setError(`Failed to load data: ${error instanceof Error ? error.message : "Unknown error"}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleApproveSkill = async (skillId: string) => {
    try {
      await updateDoc(doc(db, "skill_offers", skillId), {
        status: "approved",
        flagged: false,
      })
      setSkills(skills.map((s) => (s.id === skillId ? { ...s, status: "approved", flagged: false } : s)))
    } catch (error) {
      console.error("Error approving skill:", error)
    }
  }

  const handleRejectSkill = async (skillId: string) => {
    try {
      await deleteDoc(doc(db, "skill_offers", skillId))
      setSkills(skills.filter((s) => s.id !== skillId))
    } catch (error) {
      console.error("Error rejecting skill:", error)
    }
  }

  const handleEditSkill = async (skillId: string) => {
    try {
      await updateDoc(doc(db, "skill_offers", skillId), {
        description: editDescription,
      })
      setSkills(skills.map((s) => (s.id === skillId ? { ...s, description: editDescription } : s)))
      setEditingSkill(null)
    } catch (error) {
      console.error("Error editing skill:", error)
    }
  }

  const handleFlagSkill = async (skillId: string, reason: string) => {
    try {
      await updateDoc(doc(db, "skill_offers", skillId), {
        flagged: true,
        flagReason: reason,
      })
      setSkills(skills.map((s) => (s.id === skillId ? { ...s, flagged: true, flagReason: reason } : s)))
    } catch (error) {
      console.error("Error flagging skill:", error)
    }
  }

  const handleBulkApproveSkills = async () => {
    try {
      for (const skillId of selectedSkills) {
        await updateDoc(doc(db, "skill_offers", skillId), {
          status: "approved",
          flagged: false,
        })
      }
      setSkills(skills.map((s) => (selectedSkills.has(s.id) ? { ...s, status: "approved", flagged: false } : s)))
      setSelectedSkills(new Set())
    } catch (error) {
      console.error("Error bulk approving skills:", error)
    }
  }

  const handleBulkRejectSkills = async () => {
    try {
      for (const skillId of selectedSkills) {
        await deleteDoc(doc(db, "skill_offers", skillId))
      }
      setSkills(skills.filter((s) => !selectedSkills.has(s.id)))
      setSelectedSkills(new Set())
    } catch (error) {
      console.error("Error bulk rejecting skills:", error)
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, "skill_requests", requestId), {
        status: "approved",
      })
      setRequests(requests.map((r) => (r.id === requestId ? { ...r, status: "approved" } : r)))
    } catch (error) {
      console.error("Error approving request:", error)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, "skill_requests", requestId))
      setRequests(requests.filter((r) => r.id !== requestId))
    } catch (error) {
      console.error("Error rejecting request:", error)
    }
  }

  const toggleSkillSelection = (skillId: string) => {
    const newSelected = new Set(selectedSkills)
    if (newSelected.has(skillId)) {
      newSelected.delete(skillId)
    } else {
      newSelected.add(skillId)
    }
    setSelectedSkills(newSelected)
  }

  const toggleAllSkillSelection = () => {
    if (selectedSkills.size === skills.length) {
      setSelectedSkills(new Set())
    } else {
      setSelectedSkills(new Set(skills.map((s) => s.id)))
    }
  }

  const flaggedSkills = skills.filter((s) => s.flagged)
  const pendingSkills = skills.filter((s) => s.status !== "approved")

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Content Moderation</h1>
        <p className="text-muted-foreground">Review and moderate user-generated content</p>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}

      <div className="flex gap-4 mb-6">
        <Button variant={activeTab === "skills" ? "default" : "outline"} onClick={() => setActiveTab("skills")}>
          Skills ({skills.length})
        </Button>
        <Button variant={activeTab === "requests" ? "default" : "outline"} onClick={() => setActiveTab("requests")}>
          Requests ({requests.length})
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p>Loading content...</p>
        </div>
      ) : (
        <>
          {activeTab === "skills" && (
            <>
              {selectedSkills.size > 0 && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium">{selectedSkills.size} skills selected</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleBulkApproveSkills}>
                      Approve Selected
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          Reject Selected
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogTitle>Reject Skills</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to reject {selectedSkills.size} skills? This action cannot be undone.
                        </AlertDialogDescription>
                        <div className="flex gap-2 justify-end">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleBulkRejectSkills}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Reject
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Skills for Review</CardTitle>
                </CardHeader>
                <CardContent>
                  {skills.length === 0 ? (
                    <p className="text-muted-foreground">No skills to review</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedSkills.size === skills.length && skills.length > 0}
                                onChange={toggleAllSkillSelection}
                              />
                            </TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Offered By</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Flagged</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {skills.map((skill) => (
                            <TableRow key={skill.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedSkills.has(skill.id)}
                                  onChange={() => toggleSkillSelection(skill.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{skill.skillName}</TableCell>
                              <TableCell>{skill.category}</TableCell>
                              <TableCell>{skill.userName || "Anonymous"}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    skill.status === "approved"
                                      ? "default"
                                      : skill.status === "rejected"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {skill.status || "Pending"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {skill.flagged && <Badge variant="destructive">Flagged: {skill.flagReason}</Badge>}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handleApproveSkill(skill.id)}>
                                    Approve
                                  </Button>

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
                                        Edit
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Edit Skill Description</DialogTitle>
                                        <DialogDescription>Update the skill description</DialogDescription>
                                      </DialogHeader>
                                      <Textarea
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        placeholder="Skill description"
                                        className="min-h-32"
                                      />
                                      <div className="flex gap-2 justify-end">
                                        <Button variant="outline" onClick={() => setEditingSkill(null)}>
                                          Cancel
                                        </Button>
                                        <Button onClick={() => editingSkill && handleEditSkill(editingSkill.id)}>
                                          Save
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="destructive">
                                        Reject
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogTitle>Reject Skill</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to reject "{skill.skillName}"? This action cannot be
                                        undone.
                                      </AlertDialogDescription>
                                      <div className="flex gap-2 justify-end">
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleRejectSkill(skill.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Reject
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
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "requests" && (
            <Card>
              <CardHeader>
                <CardTitle>Skill Requests for Review</CardTitle>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <p className="text-muted-foreground">No requests to review</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Skill</TableHead>
                          <TableHead>Requested By</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">{request.topic}</TableCell>
                            <TableCell>{request.userName || "Anonymous"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  request.status === "approved"
                                    ? "default"
                                    : request.status === "rejected"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {request.status || "Pending"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleApproveRequest(request.id)}>
                                  Approve
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      Reject
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogTitle>Reject Request</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to reject this request? This action cannot be undone.
                                    </AlertDialogDescription>
                                    <div className="flex gap-2 justify-end">
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleRejectRequest(request.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Reject
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
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
