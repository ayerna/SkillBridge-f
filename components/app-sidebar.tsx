"use client"

import type * as React from "react"
import { Home, BookOpen, MessageSquare, User, LogOut, Plus, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useAuth } from "@/contexts/auth-context"
import { useNotifications } from "@/contexts/notifications-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { NotificationDropdown } from "./notification-dropdown"

const navigation = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "My Skills",
    url: "/skills",
    icon: BookOpen,
  },
  {
    title: "Messages",
    url: "/messages",
    icon: MessageSquare,
  },
  {
    title: "Profile",
    url: "/profile",
    icon: User,
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onCreateOffer: () => void
  onCreateRequest: () => void
}

export function AppSidebar({ onCreateOffer, onCreateRequest, ...props }: AppSidebarProps) {
  const { user, profile, signOut } = useAuth()
  const { messageCount, messageRequestCount } = useNotifications()
  const { theme, setTheme } = useTheme()

  const totalMessageCount = messageCount + messageRequestCount

  const getBadgeForContributions = (contributions: number) => {
    if (contributions >= 50) return "🏆 Expert"
    if (contributions >= 20) return "⭐ Mentor"
    if (contributions >= 10) return "🎯 Helper"
    if (contributions >= 5) return "🌟 Contributor"
    return "🔰 Beginner"
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm flex-shrink-0">
              SB
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
              <span className="truncate font-semibold">SkillBridge</span>
              <span className="truncate text-xs text-muted-foreground">Student Platform</span>
            </div>
          </div>
          <NotificationDropdown />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.title === "Messages" && totalMessageCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                          {totalMessageCount > 9 ? "9+" : totalMessageCount}
                        </Badge>
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <div className="px-2 space-y-2">
              <Button
                onClick={onCreateOffer}
                className="w-full justify-start bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Offer Skill
              </Button>
              <Button
                onClick={onCreateRequest}
                variant="outline"
                className="w-full justify-start bg-transparent"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Request Help
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-2 py-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.profilePicture || "/placeholder.svg"} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                    {profile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{profile?.name || user?.email?.split("@")[0]}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">
                      {profile ? getBadgeForContributions(profile.skillContributions) : "🔰 Beginner"}
                    </span>
                    {profile && profile.rating > 0 && (
                      <span className="text-xs text-yellow-500">⭐ {profile.rating.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="h-8 w-8 p-0"
                >
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
