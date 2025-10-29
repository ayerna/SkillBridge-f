"use client"

import { useEffect, useState } from "react"
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Check, X, MessageCircle, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ChatRequest {
  id: string
  fromUserId: string
  toUserId: string
  fromUserName: string
  toUserName: string
  message: string
  status: "pending" | "accepted" | "declined"
  createdAt: string
}

export function ChatRequestsPanel() {
  const { user } = useAuth()
  const [incomingRequests, setIncomingRequests] = useState<ChatRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<ChatRequest[]>([])

  useEffect(() => {
    if (!user) return

    // Listen to incoming requests
    const incomingQuery = query(
      collection(db, "chat_requests"),
      where("toUserId", "==", user.uid),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
    )

    const unsubscribeIncoming = onSnapshot(incomingQuery, (snapshot) => {
      const requests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatRequest[]
      setIncomingRequests(requests)
    })

    // Listen to outgoing requests
    const outgoingQuery = query(
      collection(db, "chat_requests"),
      where("fromUserId", "==", user.uid),
      orderBy("createdAt", "desc"),
    )

    const unsubscribeOutgoing = onSnapshot(outgoingQuery, (snapshot) => {
      const requests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatRequest[]
      setOutgoingRequests(requests)
    })

    return () => {
      unsubscribeIncoming()
      unsubscribeOutgoing()
    }
  }, [user])

  const handleAcceptRequest = async (request: ChatRequest) => {
    try {
      // Update request status
      await updateDoc(doc(db, "chat_requests", request.id), {
        status: "accepted",
      })

      // Create conversation
      const conversationRef = await addDoc(collection(db, "conversations"), {
        participants: [request.fromUserId, request.toUserId],
        createdAt: new Date().toISOString(),
        lastMessageTime: new Date().toISOString(),
        lastMessage: "",
        unreadCount: {
          [request.fromUserId]: 0,
          [request.toUserId]: 0,
        },
      })

      // Send initial message
      await addDoc(collection(db, "messages"), {
        conversationId: conversationRef.id,
        senderId: request.toUserId,
        receiverId: request.fromUserId,
        content: `Hi ${request.fromUserName}! I accepted your chat request. Let's connect!`,
        createdAt: new Date().toISOString(),
        read: false,
      })

      // Notify the requester
      await addDoc(collection(db, "notifications"), {
        userId: request.fromUserId,
        type: "chat_accepted",
        title: "Chat request accepted!",
        message: `${request.toUserName} accepted your chat request`,
        read: false,
        createdAt: new Date().toISOString(),
        data: { conversationId: conversationRef.id },
      })
    } catch (error) {
      console.error("Error accepting chat request:", error)
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, "chat_requests", requestId), {
        status: "declined",
      })
    } catch (error) {
      console.error("Error declining chat request:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "declined":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <Check className="h-3 w-3" />
      case "declined":
        return <X className="h-3 w-3" />
      case "pending":
        return <Clock className="h-3 w-3" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Incoming Chat Requests ({incomingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-4">
                {incomingRequests.map((request) => (
                  <div key={request.id} className="flex items-start gap-3 p-4 border rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {request.fromUserName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{request.fromUserName}</h4>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{request.message}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptRequest(request)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeclineRequest(request.id)}>
                          <X className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Outgoing Requests */}
      {outgoingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Sent Chat Requests ({outgoingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-60">
              <div className="space-y-4">
                {outgoingRequests.map((request) => (
                  <div key={request.id} className="flex items-start gap-3 p-4 border rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {request.toUserName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{request.toUserName}</h4>
                        <Badge className={`text-xs ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span className="ml-1 capitalize">{request.status}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{request.message}</p>
                      <span className="text-xs text-muted-foreground">
                        Sent {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No chat requests</h3>
            <p className="text-sm text-muted-foreground">
              Start connecting with other students by sending chat requests from the dashboard
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
