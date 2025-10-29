"use client"

import { useState } from "react"
import { collection, addDoc, doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from 'lucide-react'

const skillCategories = [
  "Programming",
  "Design", 
  "Academics",
  "Soft Skills",
  "Languages",
  "Music",
  "Sports",
  "Other"
]

interface SkillRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function SkillRequestModal({ open, onOpenChange, onSuccess }: SkillRequestModalProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    topic: "",
    description: "",
    urgency: "",
    category: "",
    preferredLevel: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError("")

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      const userData = userDoc.data()

      await addDoc(collection(db, "skill_requests"), {
        ...formData,
        userId: user.uid,
        userName: userData?.name || "Anonymous",
        userEmail: user.email,
        department: userData?.department || "",
        userRating: userData?.rating || 0,
        createdAt: new Date().toISOString(),
        status: "active"
      })

      // Reset form
      setFormData({ topic: "", description: "", urgency: "", category: "", preferredLevel: "" })
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      setError("Failed to create skill request")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Request Help
          </DialogTitle>
          <DialogDescription>
            Ask for help with a skill you want to learn
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-sm font-medium">
                Topic/Skill Needed *
              </Label>
              <Input
                id="topic"
                name="topic"
                value={formData.topic}
                onChange={handleChange}
                placeholder="e.g., JavaScript Basics"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Category *
              </Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {skillCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Urgency Level *</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, urgency: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">🟢 Low - No rush</SelectItem>
                  <SelectItem value="Medium">🟡 Medium - Few weeks</SelectItem>
                  <SelectItem value="High">🔴 High - Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Preferred Helper Level</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, preferredLevel: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Any level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Any">Any Level</SelectItem>
                  <SelectItem value="Intermediate">⭐ Intermediate+</SelectItem>
                  <SelectItem value="Advanced">🏆 Advanced+</SelectItem>
                  <SelectItem value="Expert">👑 Expert Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description *
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe what specific help you need, your current level, and what you hope to achieve..."
              rows={3}
              className="resize-none"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading || !formData.urgency || !formData.category}
              className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Request"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
