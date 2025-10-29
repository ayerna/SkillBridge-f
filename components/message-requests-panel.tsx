"use client"

import { useEffect, useState } from "react"
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, X, MessageCircle, Clock, Search, Filter, Eye, EyeOff, Ban } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface MessageRequest {
  id: string
  fromUserId: string
  toUserId: string
  fromUserName: string
  toUserName: string
  message: string
  status: "pending" | "accepted" | "declined" | "blocked"
  createdAt: string
  isHidden: boolean
}

export function MessageRequestsPanel() {
  const { user } = useAuth()
  const [incomingRequests, setIncomingRequests] = useState<MessageRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<MessageRequest[]>([])
  const [hiddenRequests, setHiddenRequests] = useState<MessageRequest[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("newest")

  useEffect(() => {
    if (!user) return

    // Listen to incoming requests - simplified query
    const incomingQuery = query(collection(db, "message_requests"), where("toUserId", "==", user.uid))

    const unsubscribeIncoming = onSnapshot(incomingQuery, (snapshot) => {
      const requests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MessageRequest[]

      // Filter and sort on client side
      const sortedRequests = requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      const visible = sortedRequests.filter((r) => !r.isHidden && r.status === "pending")
      const hidden = sortedRequests.filter((r) => r.isHidden && r.status === "pending")

      setIncomingRequests(visible)
      setHiddenRequests(hidden)
    })

    // Listen to outgoing requests - simplified query
    const outgoingQuery = query(collection(db, "message_requests"), where("fromUserId", "==", user.uid))

    const unsubscribeOutgoing = onSnapshot(outgoingQuery, (snapshot) => {
      const requests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MessageRequest[]

      // Sort on client side
      const sortedRequests = requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setOutgoingRequests(sortedRequests)
    })

    return () => {
      unsubscribeIncoming()
      unsubscribeOutgoing()
    }
  }, [user])

  const handleAcceptRequest = async (request: MessageRequest) => {
    try {
      // Update request status
      await updateDoc(doc(db, "message_requests", request.id), {
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
        isPinned: {
          [request.fromUserId]: false,
          [request.toUserId]: false,
        },
        theme: "default",
      })

      // Send initial acceptance message
      await addDoc(collection(db, "messages"), {
        conversationId: conversationRef.id,
        senderId: request.toUserId,
        receiverId: request.fromUserId,
        content: `Hi ${request.fromUserName}! I accepted your message request. Let's connect!`,
        createdAt: new Date().toISOString(),
        read: false,
        type: "text",
        edited: false,
        deleted: false,
      })

      // Notify the requester
      await addDoc(collection(db, "notifications"), {
        userId: request.fromUserId,
        type: "message_accepted",
        title: "Message request accepted!",
        message: `${request.toUserName} accepted your message request`,
        read: false,
        createdAt: new Date().toISOString(),
        data: { conversationId: conversationRef.id },
      })
    } catch (error) {
      console.error("Error accepting message request:", error)
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, "message_requests", requestId), {
        status: "declined",
      })
    } catch (error) {
      console.error("Error declining message request:", error)
    }
  }

  const handleBlockUser = async (request: MessageRequest) => {
    try {
      await updateDoc(doc(db, "message_requests", request.id), {
        status: "blocked",
      })

      // Add to blocked users list
      await addDoc(collection(db, "blocked_users"), {
        userId: user?.uid,
        blockedUserId: request.fromUserId,
        blockedUserName: request.fromUserName,
        createdAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error blocking user:", error)
    }
  }

  const handleHideRequest = async (requestId: string, hide: boolean) => {
    try {
      await updateDoc(doc(db, "message_requests", requestId), {
        isHidden: hide,
      })
    } catch (error) {
      console.error("Error hiding/showing request:", error)
    }
  }

  const handleDeleteRequest = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, "message_requests", requestId))
    } catch (error) {
      console.error("Error deleting request:", error)
    }
  }

  const filterAndSortRequests = (requests: MessageRequest[]) => {
    let filtered = requests

    if (searchTerm) {
      filtered = filtered.filter(
        (request) =>
          request.fromUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          request.message.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    switch (sortBy) {
      case "oldest":
        return filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      case "name":
        return filtered.sort((a, b) => a.fromUserName.localeCompare(b.fromUserName))
      default: // newest
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "declined":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "blocked":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
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
      case "blocked":
        return <Ban className="h-3 w-3" />
      case "pending":
        return <Clock className="h-3 w-3" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="incoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="incoming" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Incoming ({incomingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Sent ({outgoingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="hidden" className="flex items-center gap-2">
            <EyeOff className="h-4 w-4" />
            Hidden ({hiddenRequests.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="incoming" className="mt-6">
          {incomingRequests.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Message Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {filterAndSortRequests(incomingRequests).map((request) => (
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
                          <p className="text-sm text-muted-foreground line-clamp-3">{request.message}</p>
                          <div className="flex gap-2 flex-wrap">
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
                            <Button size="sm" variant="outline" onClick={() => handleHideRequest(request.id, true)}>
                              <EyeOff className="h-4 w-4 mr-1" />
                              Hide
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleBlockUser(request)}>
                              <Ban className="h-4 w-4 mr-1" />
                              Block
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No message requests</h3>
                <p className="text-sm text-muted-foreground">
                  When someone wants to message you, their request will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="mt-6">
          {outgoingRequests.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Sent Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {filterAndSortRequests(outgoingRequests).map((request) => (
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
                          <p className="text-sm text-muted-foreground line-clamp-3">{request.message}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Sent {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                            </span>
                            {request.status === "pending" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteRequest(request.id)}
                                className="text-red-500 hover:text-red-600"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No sent requests</h3>
                <p className="text-sm text-muted-foreground">Message requests you send will appear here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="hidden" className="mt-6">
          {hiddenRequests.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <EyeOff className="h-5 w-5" />
                  Hidden Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {filterAndSortRequests(hiddenRequests).map((request) => (
                      <div key={request.id} className="flex items-start gap-3 p-4 border rounded-lg opacity-60">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
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
                          <p className="text-sm text-muted-foreground line-clamp-3">{request.message}</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleHideRequest(request.id, false)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Show
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteRequest(request.id)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <EyeOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No hidden requests</h3>
                <p className="text-sm text-muted-foreground">Requests you hide will appear here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
