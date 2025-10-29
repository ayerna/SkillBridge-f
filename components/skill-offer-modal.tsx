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
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, X, Loader2 } from 'lucide-react'

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

interface SkillOfferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function SkillOfferModal({ open, onOpenChange, onSuccess }: SkillOfferModalProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    skillName: "",
    description: "",
    availability: "",
    category: "",
    level: ""
  })
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError("")

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      const userData = userDoc.data()

      await addDoc(collection(db, "skill_offers"), {
        ...formData,
        tags,
        userId: user.uid,
        userName: userData?.name || "Anonymous",
        userEmail: user.email,
        department: userData?.department || "",
        userRating: userData?.rating || 0,
        createdAt: new Date().toISOString(),
        status: "active"
      })

      // Reset form
      setFormData({ skillName: "", description: "", availability: "", category: "", level: "" })
      setTags([])
      setNewTag("")
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      setError("Failed to create skill offer")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Share Your Skill
          </DialogTitle>
          <DialogDescription>
            Help fellow students by offering your expertise
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
              <Label htmlFor="skillName" className="text-sm font-medium">
                Skill Name *
              </Label>
              <Input
                id="skillName"
                name="skillName"
                value={formData.skillName}
                onChange={handleChange}
                placeholder="e.g., Python Programming"
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

          <div className="space-y-2">
            <Label htmlFor="level" className="text-sm font-medium">
              Skill Level *
            </Label>
            <Select onValueChange={(value) => setFormData(prev => ({ ...prev, level: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select your level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Beginner">🔰 Beginner</SelectItem>
                <SelectItem value="Intermediate">⭐ Intermediate</SelectItem>
                <SelectItem value="Advanced">🏆 Advanced</SelectItem>
                <SelectItem value="Expert">👑 Expert</SelectItem>
              </SelectContent>
            </Select>
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
              placeholder="Describe what you can teach and your experience level..."
              rows={3}
              className="resize-none"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="availability" className="text-sm font-medium">
              Availability *
            </Label>
            <Input
              id="availability"
              name="availability"
              value={formData.availability}
              onChange={handleChange}
              placeholder="e.g., Weekends, Evenings, Flexible"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
              {tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1 animate-in fade-in-0 zoom-in-95"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(index)}
                    className="ml-1 hover:text-red-500 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                className="flex-1"
              />
              <Button type="button" onClick={addTag} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading || !formData.category || !formData.level}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Offer"
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
