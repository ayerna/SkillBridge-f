"use client"

import { Bell, CheckCheck, MessageSquare, Star, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "@/contexts/notifications-context"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"

export function NotificationDropdown() {
  const { notifications, messageNotifications, messageRequestCount, totalCount, markAsRead, markAllAsRead } =
    useNotifications()
  const router = useRouter()

  const allNotifications = [
    ...messageNotifications.map((msg) => ({
      ...msg,
      icon: MessageSquare,
    })),
    ...notifications.map((notif) => ({
      ...notif,
      icon: notif.type === "rating" ? Star : AlertCircle,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const handleNotificationClick = (notification: any) => {
    if (notification.type === "message") {
      router.push(`/messages?conversationId=${notification.conversationId}`)
    } else if (notification.data?.targetId) {
      if (notification.type === "response") {
        router.push(`/skills?skillId=${notification.data.targetId}`)
      } else if (notification.type === "rating") {
        router.push(`/profile?userId=${notification.data.targetId}`)
      }
    }

    if (!notification.read) {
      markAsRead(notification.id)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0 hover:bg-sidebar-accent rounded-md transition-colors flex-shrink-0"
        >
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full"
            >
              {totalCount > 9 ? "9+" : totalCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[90vw] sm:w-80 max-w-sm z-9999 max-h-[80vh] sm:max-h-96 p-0 fixed"
        sideOffset={8}
      >
        <div className="flex flex-col h-full">
          <DropdownMenuLabel className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
            <span>Notifications</span>
            {totalCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-6 px-2 text-xs">
                <CheckCheck className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Mark all read</span>
                <span className="sm:hidden">Mark read</span>
              </Button>
            )}
          </DropdownMenuLabel>
          <ScrollArea className="flex-1 overflow-hidden">
            {allNotifications.length > 0 ? (
              <div className="space-y-1 p-1">
                {allNotifications.slice(0, 10).map((notification) => {
                  const Icon = notification.icon
                  return (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`flex flex-col items-start p-3 cursor-pointer rounded-md mx-1 transition-colors ${
                        !notification.read ? "bg-blue-50 dark:bg-blue-950" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Icon className="h-4 w-4 mt-1 text-blue-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-1">{notification.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        {!notification.read && <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
                      </div>
                    </DropdownMenuItem>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
