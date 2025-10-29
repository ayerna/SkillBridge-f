"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SkillOfferModal } from "@/components/skill-offer-modal"
import { SkillRequestModal } from "@/components/skill-request-modal"
import { MessageRequestsPanel } from "@/components/message-requests-panel"
import { EnhancedChatInterface } from "@/components/enhanced-chat-interface"
import { Search, MessageCircle, Users, Pin, Filter, ArrowLeft } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Conversation {
  id: string
  participants: string[]
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isPinned: { [userId: string]: boolean }
  theme: string
  otherUser: {
    id: string
    name: string
    email: string
    rating: number
    profilePicture?: string
    isOnline?: boolean
    lastSeen?: string
  }
}

export default function MessagesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetUserId = searchParams.get("userId")

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("recent")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  // Fetch conversations
  useEffect(() => {
    if (!user) return

    const q = query(collection(db, "conversations"), where("participants", "array-contains", user.uid))

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const conversationsData: Conversation[] = []

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data()
        const otherUserId = data.participants.find((id: string) => id !== user.uid)

        if (otherUserId) {
          const otherUserDoc = await getDoc(doc(db, "users", otherUserId))
          const otherUserData = otherUserDoc.data()

          conversationsData.push({
            id: docSnapshot.id,
            participants: data.participants,
            lastMessage: data.lastMessage || "",
            lastMessageTime: data.lastMessageTime || "",
            unreadCount: data.unreadCount?.[user.uid] || 0,
            isPinned: data.isPinned || {},
            theme: data.theme || "default",
            otherUser: {
              id: otherUserId,
              name: otherUserData?.name || "Unknown",
              email: otherUserData?.email || "",
              rating: otherUserData?.rating || 0,
              profilePicture: otherUserData?.profilePicture,
              isOnline: otherUserData?.isOnline || false,
              lastSeen: otherUserData?.lastSeen,
            },
          })
        }
      }

      // Sort by lastMessageTime on client side
      conversationsData.sort(
        (a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime(),
      )

      setConversations(conversationsData)
    })

    return unsubscribe
  }, [user])

  // Auto-select conversation if userId in URL
  useEffect(() => {
    if (targetUserId && user && conversations.length > 0) {
      const existingConversation = conversations.find((conv) => conv.otherUser.id === targetUserId)

      if (existingConversation) {
        setSelectedConversation(existingConversation)
      }
    }
  }, [targetUserId, user, conversations])

  const filterAndSortConversations = (conversations: Conversation[]) => {
    let filtered = conversations

    if (searchTerm) {
      filtered = filtered.filter(
        (conv) =>
          conv.otherUser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    switch (sortBy) {
      case "name":
        return filtered.sort((a, b) => a.otherUser.name.localeCompare(b.otherUser.name))
      case "unread":
        return filtered.sort((a, b) => b.unreadCount - a.unreadCount)
      case "pinned":
        return filtered.sort((a, b) => {
          const aPinned = a.isPinned[user?.uid || ""] || false
          const bPinned = b.isPinned[user?.uid || ""] || false
          if (aPinned && !bPinned) return -1
          if (!aPinned && bPinned) return 1
          return b.unreadCount - a.unreadCount
        })
      default: // recent
        return filtered
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) return null

  const filteredConversations = filterAndSortConversations(conversations)

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
                  {selectedConversation ? (
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedConversation(null)} className="p-1">
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      Chat with {selectedConversation.otherUser.name}
                    </div>
                  ) : (
                    "Messages"
                  )}
                </h1>
              </div>
            </div>
          </header>

          <div className="p-6">
            {selectedConversation ? (
              <div className="h-[calc(100vh-8rem)] border rounded-lg bg-white/50 dark:bg-gray-900/50">
                <EnhancedChatInterface
                  conversation={selectedConversation}
                  onBack={() => setSelectedConversation(null)}
                />
              </div>
            ) : (
              <Tabs defaultValue="conversations" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="conversations" className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Conversations ({conversations.length})
                  </TabsTrigger>
                  <TabsTrigger value="requests" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Message Requests
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="conversations" className="mt-6">
                  <div className="space-y-6">
                    {/* Search and Filter */}
                    <div className="flex gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search conversations..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-48">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recent">Most Recent</SelectItem>
                          <SelectItem value="pinned">Pinned First</SelectItem>
                          <SelectItem value="unread">Unread First</SelectItem>
                          <SelectItem value="name">By Name</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Conversations List */}
                    {filteredConversations.length > 0 ? (
                      <div className="grid gap-3">
                        {filteredConversations.map((conversation) => (
                          <Card
                            key={conversation.id}
                            className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-0 shadow-sm"
                            onClick={() => setSelectedConversation(conversation)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <Avatar className="h-12 w-12">
                                    <AvatarImage src={conversation.otherUser.profilePicture || "/placeholder.svg"} />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                      {conversation.otherUser.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  {conversation.otherUser.isOnline && (
                                    <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full"></div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium truncate">{conversation.otherUser.name}</p>
                                    {conversation.isPinned[user.uid] && <Pin className="h-3 w-3 text-blue-600" />}
                                    {conversation.otherUser.rating > 0 && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs">⭐</span>
                                        <span className="text-xs">{conversation.otherUser.rating.toFixed(1)}</span>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {conversation.lastMessage || "No messages yet"}
                                  </p>
                                  <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-muted-foreground">
                                      {conversation.lastMessageTime &&
                                        formatDistanceToNow(new Date(conversation.lastMessageTime), {
                                          addSuffix: true,
                                        })}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {conversation.otherUser.isOnline
                                        ? "Online"
                                        : conversation.otherUser.lastSeen
                                          ? `Last seen ${formatDistanceToNow(new Date(conversation.otherUser.lastSeen), { addSuffix: true })}`
                                          : ""}
                                    </p>
                                  </div>
                                </div>
                                {conversation.unreadCount > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="h-6 w-6 flex items-center justify-center p-0 text-xs"
                                  >
                                    {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="font-medium mb-2">No conversations yet</h3>
                          <p className="text-sm text-muted-foreground">
                            {searchTerm
                              ? "No conversations match your search"
                              : "Accept message requests to start conversations"}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="requests" className="mt-6">
                  <MessageRequestsPanel />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        {/* Modals */}
        <SkillOfferModal open={showOfferModal} onOpenChange={setShowOfferModal} />
        <SkillRequestModal open={showRequestModal} onOpenChange={setShowRequestModal} />
      </SidebarInset>
    </SidebarProvider>
  )
}
