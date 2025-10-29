"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SkillOfferModal } from "@/components/skill-offer-modal"
import { SkillRequestModal } from "@/components/skill-request-modal"
import { PasswordManagement } from "@/components/password-management"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, X, Edit, Save, User, Mail, GraduationCap, Calendar } from "lucide-react"

interface UserProfile {
  name: string
  email: string
  department: string
  year: string
  skills: string[]
}

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editing, setEditing] = useState(false)
  const [newSkill, setNewSkill] = useState("")
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid)
          const docSnap = await getDoc(docRef)

          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile)
          }
        } catch (error) {
          console.error("Error fetching profile:", error)
        }
      }
    }

    fetchProfile()
  }, [user])

  const handleSave = async () => {
    if (!user || !profile) return

    try {
      const docRef = doc(db, "users", user.uid)
      await updateDoc(docRef, {
        name: profile.name,
        department: profile.department,
        year: profile.year,
        skills: profile.skills,
      })

      setEditing(false)
      setSuccess("Profile updated successfully!")
      setTimeout(() => setSuccess(""), 3000)
    } catch (error) {
      setError("Failed to update profile")
      setTimeout(() => setError(""), 3000)
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && profile) {
      setProfile({
        ...profile,
        skills: [...profile.skills, newSkill.trim()],
      })
      setNewSkill("")
    }
  }

  const removeSkill = (index: number) => {
    if (profile) {
      setProfile({
        ...profile,
        skills: profile.skills.filter((_, i) => i !== index),
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !profile) return null

  return (
    <SidebarProvider>
      <AppSidebar onCreateOffer={() => setShowOfferModal(true)} onCreateRequest={() => setShowRequestModal(true)} />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-gray-900 dark:to-gray-800">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b">
            <div className="flex h-16 items-center gap-4 px-6">
              <SidebarTrigger className="-ml-1" />
              <div className="flex-1">
                <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  My Profile
                </h1>
              </div>
            </div>
          </header>

          <div className="p-6 space-y-6">
            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Profile Header */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <CardContent className="p-8">
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 border-4 border-white/20">
                    <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                      {profile.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-2">{profile.name || "Student"}</h2>
                    <div className="flex flex-wrap gap-4 text-blue-100">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{profile.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        <span>{profile.department}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{profile.year}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setEditing(!editing)}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    {editing ? <Save className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                    {editing ? "Save" : "Edit"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Personal Information */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Manage your basic profile details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      disabled={!editing}
                      className="transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input id="email" value={profile.email} disabled className="bg-muted" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm font-medium">
                      Department
                    </Label>
                    <Input
                      id="department"
                      value={profile.department}
                      onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                      disabled={!editing}
                      className="transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year" className="text-sm font-medium">
                      Year
                    </Label>
                    <Input
                      id="year"
                      value={profile.year}
                      onChange={(e) => setProfile({ ...profile, year: e.target.value })}
                      disabled={!editing}
                      className="transition-all duration-200"
                    />
                  </div>

                  {editing && (
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSave} className="bg-gradient-to-r from-blue-500 to-purple-600">
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Skills */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    My Skills
                  </CardTitle>
                  <CardDescription>Skills you can share with other students</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 min-h-[100px] p-4 border-2 border-dashed border-muted rounded-lg">
                    {profile.skills.length > 0 ? (
                      profile.skills.map((skill, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 animate-in fade-in-0 zoom-in-95"
                        >
                          {skill}
                          {editing && (
                            <button
                              onClick={() => removeSkill(index)}
                              className="ml-1 hover:text-red-500 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))
                    ) : (
                      <div className="flex-1 text-center text-muted-foreground py-8">
                        <GraduationCap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No skills added yet</p>
                        <p className="text-sm">Add your first skill to get started!</p>
                      </div>
                    )}
                  </div>

                  {editing && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a skill (e.g., Python, Design, Writing)"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addSkill()}
                        className="flex-1"
                      />
                      <Button onClick={addSkill} size="sm" variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <PasswordManagement />
          </div>
        </div>

        {/* Modals */}
        <SkillOfferModal open={showOfferModal} onOpenChange={setShowOfferModal} />
        <SkillRequestModal open={showRequestModal} onOpenChange={setShowRequestModal} />
      </SidebarInset>
    </SidebarProvider>
  )
}
