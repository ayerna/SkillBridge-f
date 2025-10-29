"use client"

import type React from "react"

import { useState } from "react"
import { collection, addDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageCircle, Loader2 } from "lucide-react"

interface ChatRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetUserId: string
  targetUserName: string
  onSuccess?: () => void
}

export function ChatRequestModal({
  open,
  onOpenChange,
  targetUserId,
  targetUserName,
  onSuccess,
}: ChatRequestModalProps) {
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
      // Create chat request
      await addDoc(collection(db, "chat_requests"), {
        fromUserId: user.uid,
        toUserId: targetUserId,
        fromUserName: profile?.name || user.email?.split("@")[0] || "Unknown",
        toUserName: targetUserName,
        message: message.trim(),
        status: "pending", // pending, accepted, declined
        createdAt: new Date().toISOString(),
      })

      // Create notification for the target user
      await addDoc(collection(db, "notifications"), {
        userId: targetUserId,
        type: "chat_request",
        title: "New chat request",
        message: `${profile?.name || user.email?.split("@")[0]} wants to chat with you`,
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
      setError("Failed to send chat request")
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
            Send Chat Request
          </DialogTitle>
          <DialogDescription>Send a message to {targetUserName} to start a conversation</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {targetUserName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{targetUserName}</p>
            <p className="text-sm text-muted-foreground">Will receive your chat request</p>
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
              Introduce yourself and explain why you'd like to chat *
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi! I saw your skill offer/request and would love to connect..."
              rows={4}
              className="resize-none"
              required
            />
            <p className="text-xs text-muted-foreground">This message will be sent with your chat request</p>
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
