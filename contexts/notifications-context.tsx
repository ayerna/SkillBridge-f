"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore"
import { useAuth } from "./auth-context"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"

interface Notification {
  id: string
  userId: string
  type: "message" | "response" | "rating"
  title: string
  message: string
  read: boolean
  createdAt: string
  data?: any
}

interface MessageNotification {
  id: string
  type: "message"
  title: string
  message: string
  read: boolean
  createdAt: string
  senderId: string
  senderName: string
  conversationId: string
}

interface NotificationsContextType {
  notifications: Notification[]
  messageNotifications: MessageNotification[]
  unreadCount: number
  messageCount: number
  messageRequestCount: number
  totalCount: number
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  messageNotifications: [],
  unreadCount: 0,
  messageCount: 0,
  messageRequestCount: 0,
  totalCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
})

export const useNotifications = () => {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider")
  }
  return context
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [messageNotifications, setMessageNotifications] = useState<MessageNotification[]>([])
  const [messageRequestCount, setMessageRequestCount] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    if (!user) return

    const q = query(collection(db, "notifications"), where("userId", "==", user.uid))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications: Notification[] = []
      const addedNotifications: Notification[] = []

      snapshot.docChanges().forEach((change) => {
        const notification = { id: change.doc.id, ...change.doc.data() } as Notification

        if (change.type === "added") {
          addedNotifications.push(notification)
        }
      })

      snapshot.forEach((doc) => {
        newNotifications.push({ id: doc.id, ...doc.data() } as Notification)
      })

      newNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setNotifications(newNotifications)

      if (notifications.length > 0) {
        addedNotifications.forEach((notification) => {
          if (!notification.read) {
            toast({
              title: notification.title,
              description: notification.message,
              duration: 4000,
            })
          }
        })
      }
    })

    return unsubscribe
  }, [user, notifications.length, toast])

  useEffect(() => {
    if (!user) return

    const q = query(collection(db, "conversations"), where("participants", "array-contains", user.uid))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: MessageNotification[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        const unreadCount = data.unreadBy?.[user.uid] || 0

        if (unreadCount > 0) {
          const otherUserId = data.participants.find((id: string) => id !== user.uid)
          messages.push({
            id: doc.id,
            type: "message",
            title: `New message from ${data.participantNames?.[otherUserId] || "Unknown"}`,
            message: data.lastMessage || "You have unread messages",
            read: false,
            createdAt: data.lastMessageTime || new Date().toISOString(),
            senderId: otherUserId,
            senderName: data.participantNames?.[otherUserId] || "Unknown",
            conversationId: doc.id,
          })
        }
      })

      setMessageNotifications(messages)
    })

    return unsubscribe
  }, [user])

  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, "message_requests"),
      where("toUserId", "==", user.uid),
      where("status", "==", "pending"),
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessageRequestCount(snapshot.docs.length)
    })

    return unsubscribe
  }, [user])

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.read)

    try {
      await Promise.all(
        unreadNotifications.map((notification) =>
          updateDoc(doc(db, "notifications", notification.id), {
            read: true,
          }),
        ),
      )
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const messageCount = messageNotifications.length
  const totalCount = unreadCount + messageCount + messageRequestCount

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        messageNotifications,
        unreadCount,
        messageCount,
        messageRequestCount,
        totalCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}
