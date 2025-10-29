"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Send,
  MoreVertical,
  Edit3,
  Trash2,
  Copy,
  Pin,
  PinOff,
  Palette,
  Smile,
  ImageIcon,
  Mic,
  Check,
  CheckCheck,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Message {
  id: string
  conversationId: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
  read: boolean
  type: "text" | "image" | "voice" | "gif"
  edited: boolean
  deleted: boolean
  replyTo?: string
}

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

interface TypingIndicator {
  userId: string
  userName: string
  conversationId: string
  timestamp: string
}

interface EnhancedChatInterfaceProps {
  conversation: Conversation
  onBack?: () => void
}

export function EnhancedChatInterface({ conversation, onBack }: EnhancedChatInterfaceProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!conversation.id || !user) return

    // Reset unread count for current user when conversation is opened
    const resetUnreadCount = async () => {
      try {
        await updateDoc(doc(db, "conversations", conversation.id), {
          [`unreadCount.${user.uid}`]: 0,
        })
      } catch (error) {
        console.error("Error resetting unread count:", error)
      }
    }

    resetUnreadCount()
  }, [conversation.id, user])

  // Fetch messages
  useEffect(() => {
    if (!conversation.id) return

    const q = query(collection(db, "messages"), where("conversationId", "==", conversation.id))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[]

      // Sort by createdAt on client side
      messagesData.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      setMessages(messagesData)

      // Mark messages as read
      messagesData.forEach(async (message) => {
        if (message.receiverId === user?.uid && !message.read) {
          await updateDoc(doc(db, "messages", message.id), {
            read: true,
          })
        }
      })
    })

    return unsubscribe
  }, [conversation.id, user])

  // Listen for typing indicators
  useEffect(() => {
    if (!conversation.id) return

    const q = query(collection(db, "typing_indicators"), where("conversationId", "==", conversation.id))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const indicators = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TypingIndicator[]

      // Filter out current user and old indicators on client side
      const recentIndicators = indicators.filter(
        (indicator) =>
          indicator.userId !== (user?.uid || "") && Date.now() - new Date(indicator.timestamp).getTime() < 3000,
      )

      setTypingUsers(recentIndicators)
    })

    return unsubscribe
  }, [conversation.id, user])

  const handleTyping = () => {
    if (!isTyping && user) {
      setIsTyping(true)
      addDoc(collection(db, "typing_indicators"), {
        userId: user.uid,
        userName: user.email?.split("@")[0] || "Unknown",
        conversationId: conversation.id,
        timestamp: new Date().toISOString(),
      })
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 2000)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    try {
      // Add message
      await addDoc(collection(db, "messages"), {
        conversationId: conversation.id,
        senderId: user.uid,
        receiverId: conversation.otherUser.id,
        content: newMessage.trim(),
        createdAt: new Date().toISOString(),
        read: false,
        type: "text",
        edited: false,
        deleted: false,
      })

      // Update conversation
      await updateDoc(doc(db, "conversations", conversation.id), {
        lastMessage: newMessage.trim(),
        lastMessageTime: new Date().toISOString(),
        [`unreadCount.${conversation.otherUser.id}`]: (conversation.unreadCount || 0) + 1,
      })

      // Create notification
      await addDoc(collection(db, "notifications"), {
        userId: conversation.otherUser.id,
        type: "message",
        title: "New message",
        message: `${user.email?.split("@")[0]} sent you a message`,
        read: false,
        createdAt: new Date().toISOString(),
        data: { conversationId: conversation.id },
      })

      setNewMessage("")
      setIsTyping(false)
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return

    try {
      await updateDoc(doc(db, "messages", messageId), {
        content: editContent.trim(),
        edited: true,
      })
      setEditingMessage(null)
      setEditContent("")
    } catch (error) {
      console.error("Error editing message:", error)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await updateDoc(doc(db, "messages", messageId), {
        content: "This message was deleted",
        deleted: true,
      })
    } catch (error) {
      console.error("Error deleting message:", error)
    }
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const togglePinConversation = async () => {
    if (!user) return

    try {
      await updateDoc(doc(db, "conversations", conversation.id), {
        [`isPinned.${user.uid}`]: !conversation.isPinned[user.uid],
      })
    } catch (error) {
      console.error("Error toggling pin:", error)
    }
  }

  const changeTheme = async (theme: string) => {
    try {
      await updateDoc(doc(db, "conversations", conversation.id), {
        theme,
      })
    } catch (error) {
      console.error("Error changing theme:", error)
    }
  }

  const getThemeClasses = (theme: string) => {
    switch (theme) {
      case "dark":
        return "bg-gray-900 text-white"
      case "blue":
        return "bg-blue-50 dark:bg-blue-950"
      case "green":
        return "bg-green-50 dark:bg-green-950"
      case "purple":
        return "bg-purple-50 dark:bg-purple-950"
      default:
        return "bg-white dark:bg-gray-900"
    }
  }

  return (
    <div className={`flex flex-col h-full ${getThemeClasses(conversation.theme)}`}>
      {/* Chat Header */}
      <div className="p-4 border-b bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={conversation.otherUser.profilePicture || "/placeholder.svg"} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {conversation.otherUser.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                {conversation.otherUser.name}
                {conversation.otherUser.isOnline && <div className="h-2 w-2 bg-green-500 rounded-full"></div>}
              </h3>
              <p className="text-xs text-muted-foreground">
                {conversation.otherUser.isOnline
                  ? "Online"
                  : conversation.otherUser.lastSeen
                    ? `Last seen ${formatDistanceToNow(new Date(conversation.otherUser.lastSeen), { addSuffix: true })}`
                    : "Offline"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePinConversation}
              className={conversation.isPinned[user?.uid || ""] ? "text-blue-600" : ""}
            >
              {conversation.isPinned[user?.uid || ""] ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-2">
                  <p className="font-medium text-sm">Chat Theme</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["default", "dark", "blue", "green", "purple"].map((theme) => (
                      <Button
                        key={theme}
                        variant="outline"
                        size="sm"
                        onClick={() => changeTheme(theme)}
                        className={`capitalize ${conversation.theme === theme ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        {theme}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-2">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    View Profile
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-red-600">
                    Block User
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-red-600">
                    Report
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === user?.uid ? "justify-end" : "justify-start"}`}
            >
              <div className="group relative max-w-xs lg:max-w-md">
                <div
                  className={`px-4 py-2 rounded-lg ${
                    message.senderId === user?.uid
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                      : "bg-white dark:bg-gray-800 border"
                  } ${message.deleted ? "opacity-50 italic" : ""}`}
                >
                  {editingMessage === message.id ? (
                    <div className="space-y-2">
                      <Input value={editContent} onChange={(e) => setEditContent(e.target.value)} className="text-sm" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEditMessage(message.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingMessage(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">{message.content}</p>
                      {message.edited && !message.deleted && <p className="text-xs opacity-70 mt-1">edited</p>}
                    </>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <p
                      className={`text-xs ${
                        message.senderId === user?.uid ? "text-blue-100" : "text-muted-foreground"
                      }`}
                    >
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </p>
                    {message.senderId === user?.uid && (
                      <div className="flex items-center">
                        {message.read ? (
                          <CheckCheck className="h-3 w-3 text-blue-200" />
                        ) : (
                          <Check className="h-3 w-3 text-blue-200" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Message Actions */}
                {message.senderId === user?.uid && !message.deleted && (
                  <div className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-32">
                        <div className="space-y-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => {
                              setEditingMessage(message.id)
                              setEditContent(message.content)
                            }}
                          >
                            <Edit3 className="h-3 w-3 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleCopyMessage(message.content)}
                          >
                            <Copy className="h-3 w-3 mr-2" />
                            Copy
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-red-600"
                            onClick={() => handleDeleteMessage(message.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <span className="text-xs text-muted-foreground">{typingUsers[0].userName} is typing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="p-4 border-t bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm">
            <Smile className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm">
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              handleTyping()
            }}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="button" variant="ghost" size="sm">
            <Mic className="h-4 w-4" />
          </Button>
          <Button type="submit" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
