"use client"

import { useState } from "react"
import { doc, updateDoc, addDoc, collection, getDoc, increment } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Star, Loader2 } from 'lucide-react'

interface RatingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetUserId: string
  targetUserName: string
  onSuccess?: () => void
}

export function RatingModal({ 
  open, 
  onOpenChange, 
  targetUserId, 
  targetUserName,
  onSuccess 
}: RatingModalProps) {
  const { user } = useAuth()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || rating === 0) return

    setLoading(true)
    setError("")

    try {
      // Add rating to ratings collection
      await addDoc(collection(db, "ratings"), {
        fromUserId: user.uid,
        toUserId: targetUserId,
        rating,
        comment,
        createdAt: new Date().toISOString()
      })

      // Get current user data for the rating
      const targetUserDoc = await getDoc(doc(db, "users", targetUserId))
      const targetUserData = targetUserDoc.data()
      
      if (targetUserData) {
        const currentRating = targetUserData.rating || 0
        const currentTotal = targetUserData.totalRatings || 0
        const newTotal = currentTotal + 1
        const newRating = ((currentRating * currentTotal) + rating) / newTotal

        // Update target user's rating
        await updateDoc(doc(db, "users", targetUserId), {
          rating: newRating,
          totalRatings: newTotal
        })
      }

      // Create notification for the rated user
      await addDoc(collection(db, "notifications"), {
        userId: targetUserId,
        type: "rating",
        title: "You received a rating!",
        message: `${user.email?.split('@')[0]} rated you ${rating} stars`,
        read: false,
        createdAt: new Date().toISOString(),
        data: { rating, comment }
      })

      // Reset form
      setRating(0)
      setComment("")
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      setError("Failed to submit rating")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Rate {targetUserName}</DialogTitle>
          <DialogDescription>
            How was your experience learning from or teaching {targetUserName}?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Rating *</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 transition-colors"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {rating === 0 && "Click to rate"}
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-medium">
              Comment (Optional)
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading || rating === 0}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Rating"
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
