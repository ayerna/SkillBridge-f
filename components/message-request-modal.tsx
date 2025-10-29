"use client"

import type React from "react"

import { useState } from "react"
import { collection, addDoc, query, where, getDocs } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageCircle, Loader2, AlertTriangle } from "lucide-react"

interface MessageRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetUserId: string
  targetUserName: string
  onSuccess?: () => void
}

export function MessageRequestModal({
  open,
  onOpenChange,
  targetUserId,
  targetUserName,
  onSuccess,
}: MessageRequestModalProps) {
  const { user, profile } = useAuth()
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !message.trim()) return

    setLoading(true)
    setError("")

    try {
      // Check if there's already a pending request
      const existingRequestQuery = query(
        collection(db, "message_requests"),
        where("fromUserId", "==", user.uid),
        where("toUserId", "==", targetUserId),
        where("status", "==", "pending"),
      )
      const existingRequests = await getDocs(existingRequestQuery)

      if (!existingRequests.empty) {
        setError("You already have a pending message request to this user")
        setLoading(false)
        return
      }

      // Create message request
      await addDoc(collection(db, "message_requests"), {
        fromUserId: user.uid,
        toUserId: targetUserId,
        fromUserName: profile?.name || user.email?.split("@")[0] || "Unknown",
        toUserName: targetUserName,
        message: message.trim(),
        status: "pending", // pending, accepted, declined, blocked
        createdAt: new Date().toISOString(),
        isHidden: false,
      })

      // Create notification for the target user
      await addDoc(collection(db, "notifications"), {
        userId: targetUserId,
        type: "message_request",
        title: "New message request",
        message: `${profile?.name || user.email?.split("@")[0]} wants to message you`,
        read: false,
        createdAt: new Date().toISOString(),
        data: {
          fromUserId: user.uid,
          fromUserName: profile?.name || user.email?.split("@")[0] || "Unknown",
          requestMessage: message.trim(),
        },
      })

      // Reset form
      setMessage("")
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      setError("Failed to send message request")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Send Message Request
          </DialogTitle>
          <DialogDescription>
            Send a message request to {targetUserName}. They can accept or decline your request.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {targetUserName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{targetUserName}</p>
            <p className="text-sm text-muted-foreground">Will receive your message request</p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">Message Request Rules:</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• You can send one text message initially</li>
                <li>• Full chat unlocks if they accept</li>
                <li>• Be respectful and introduce yourself</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Your message *
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi! I saw your skill offer and would love to connect..."
              rows={4}
              className="resize-none"
              maxLength={500}
              required
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/500 characters • This will be your only message until accepted
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading || !message.trim()}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
