"use client"

import { SidebarProvider } from "@/components/ui/sidebar"
import type React from "react"
import { AdminGuard } from "@/components/admin-guard"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { signOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push("/auth/login")
  }

  return (
    <AdminGuard>
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <aside className="w-64 border-r bg-background overflow-y-auto flex flex-col">
            <nav className="space-y-1 p-4 flex-1">
              <div className="mb-6">
                <h2 className="px-4 py-2 text-sm font-semibold text-muted-foreground">ADMIN PANEL</h2>
              </div>

              {/* Dashboard Section */}
              <div className="space-y-1">
                <h3 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Dashboard</h3>
                <Link href="/admin" className="block px-4 py-2 rounded-lg hover:bg-accent transition-colors">
                  Overview
                </Link>
              </div>

              {/* Management Section */}
              <div className="space-y-1 mt-4">
                <h3 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Management</h3>
                <Link href="/admin/users" className="block px-4 py-2 rounded-lg hover:bg-accent transition-colors">
                  User Management
                </Link>
                <Link href="/admin/moderation" className="block px-4 py-2 rounded-lg hover:bg-accent transition-colors">
                  Content Moderation
                </Link>
                <Link href="/admin/requests" className="block px-4 py-2 rounded-lg hover:bg-accent transition-colors">
                  Requests & Transactions
                </Link>
              </div>

              {/* System Section */}
              <div className="space-y-1 mt-4">
                <h3 className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">System</h3>
                <Link href="/admin/settings" className="block px-4 py-2 rounded-lg hover:bg-accent transition-colors">
                  Settings & Monitoring
                </Link>
                <Link href="/admin/audit-logs" className="block px-4 py-2 rounded-lg hover:bg-accent transition-colors">
                  Audit Logs
                </Link>
                <Link href="/admin/security" className="block px-4 py-2 rounded-lg hover:bg-accent transition-colors">
                  Security & Access
                </Link>
              </div>

              {/* Quick Links */}
              <div className="space-y-1 mt-6 pt-4 border-t">
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 rounded-lg hover:bg-accent transition-colors text-sm"
                >
                  Back to App
                </Link>
              </div>
            </nav>

            <div className="p-4 border-t space-y-2">
              <ThemeToggle />
              <Button onClick={handleLogout} variant="outline" className="w-full justify-start gap-2 bg-transparent">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </aside>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </SidebarProvider>
    </AdminGuard>
  )
}
