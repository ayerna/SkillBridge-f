"use client"

import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface AuditLog {
  id: string
  adminId: string
  adminName: string
  action: string
  targetType: string
  targetId: string
  targetName: string
  details: string
  timestamp: string
  ipAddress?: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterAction, setFilterAction] = useState<string>("all")

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setError(null)
        console.log("[v0] Fetching audit logs...")

        const logsSnapshot = await getDocs(collection(db, "auditLogs"))
        const logsList: AuditLog[] = []

        logsSnapshot.forEach((doc) => {
          logsList.push({
            id: doc.id,
            ...doc.data(),
          } as AuditLog)
        })

        // Sort by timestamp descending
        logsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        console.log("[v0] Fetched audit logs:", logsList.length)
        setLogs(logsList)
      } catch (error) {
        console.error("[v0] Error fetching audit logs:", error)
        setError(`Failed to fetch audit logs: ${error instanceof Error ? error.message : "Unknown error"}`)
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [])

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.adminName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.targetName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.action || "").toLowerCase().includes(searchTerm.toLowerCase())

    if (filterAction === "all") return matchesSearch
    return matchesSearch && log.action === filterAction
  })

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)))

  const getActionColor = (action: string) => {
    if (action.includes("Delete")) return "destructive"
    if (action.includes("Create")) return "default"
    if (action.includes("Update")) return "secondary"
    if (action.includes("Approve")) return "default"
    if (action.includes("Reject")) return "destructive"
    return "outline"
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">Track all admin actions and system changes</p>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Admin Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Input
              type="text"
              placeholder="Search by admin, target, or action..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p>Loading audit logs...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.adminName}</TableCell>
                      <TableCell>
                        <Badge variant={getActionColor(log.action)}>{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{log.targetName}</p>
                          <p className="text-muted-foreground text-xs">{log.targetType}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{log.details}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} logs
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
