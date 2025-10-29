"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface SkillRequest {
  id: string
  skillTitle: string
  requestedBy: string
  requestedByName?: string
  requestedFrom: string
  requestedFromName?: string
  status?: string
  createdAt: string
  completedAt?: string
  disputeReason?: string
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<SkillRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed" | "disputed">("all")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setError(null)
        console.log("[v0] Fetching requests data...")

        const requestsSnapshot = await getDocs(collection(db, "skill_requests"))
        const requestsList: SkillRequest[] = []

        requestsSnapshot.forEach((doc) => {
          requestsList.push({
            id: doc.id,
            ...doc.data(),
          } as SkillRequest)
        })

        console.log("[v0] Fetched requests:", requestsList.length)
        setRequests(requestsList)
      } catch (error) {
        console.error("[v0] Error fetching requests:", error)
        setError(`Failed to fetch requests: ${error instanceof Error ? error.message : "Unknown error"}`)
      } finally {
        setLoading(false)
      }
    }

    fetchRequests()
  }, [])

  const handleMarkCompleted = async (requestId: string) => {
    try {
      await updateDoc(doc(db, "skill_requests", requestId), {
        status: "completed",
        completedAt: new Date().toISOString(),
      })
      setRequests(
        requests.map((r) =>
          r.id === requestId ? { ...r, status: "completed", completedAt: new Date().toISOString() } : r,
        ),
      )
    } catch (error) {
      console.error("Error marking request as completed:", error)
      setError("Failed to mark request as completed")
    }
  }

  const handleMarkDisputed = async (requestId: string, reason: string) => {
    try {
      await updateDoc(doc(db, "skill_requests", requestId), {
        status: "disputed",
        disputeReason: reason,
      })
      setRequests(requests.map((r) => (r.id === requestId ? { ...r, status: "disputed", disputeReason: reason } : r)))
    } catch (error) {
      console.error("Error marking request as disputed:", error)
      setError("Failed to mark request as disputed")
    }
  }

  const handleResolveDispute = async (requestId: string) => {
    try {
      await updateDoc(doc(db, "skill_requests", requestId), {
        status: "resolved",
        disputeReason: undefined,
      })
      setRequests(
        requests.map((r) => (r.id === requestId ? { ...r, status: "resolved", disputeReason: undefined } : r)),
      )
    } catch (error) {
      console.error("Error resolving dispute:", error)
      setError("Failed to resolve dispute")
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, "skill_requests", requestId), {
        status: "cancelled",
      })
      setRequests(requests.map((r) => (r.id === requestId ? { ...r, status: "cancelled" } : r)))
    } catch (error) {
      console.error("Error cancelling request:", error)
      setError("Failed to cancel request")
    }
  }

  const filteredRequests = requests.filter((request) => {
    if (filterStatus === "all") return true
    return request.status === filterStatus
  })

  const exportToCSV = () => {
    try {
      const headers = ["Skill", "Requested By", "Requested From", "Status", "Created Date", "Completed Date"]
      const rows = filteredRequests.map((r) => [
        r.skillTitle,
        r.requestedByName || r.requestedBy,
        r.requestedFromName || r.requestedFrom,
        r.status || "Pending",
        new Date(r.createdAt).toLocaleDateString(),
        r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "N/A",
      ])

      const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
      const blob = new Blob([csv], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `requests-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      setError(null)
    } catch (err) {
      console.error("Error exporting CSV:", err)
      setError("Failed to export CSV")
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Requests & Transactions</h1>
        <p className="text-muted-foreground">Manage all skill requests and resolve conflicts</p>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm mb-4">{error}</div>}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Requests</CardTitle>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">All Requests</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="disputed">Disputed</option>
              </select>
              <Button size="sm" variant="outline" onClick={exportToCSV}>
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p>Loading requests...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skill</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Requested From</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.skillTitle}</TableCell>
                      <TableCell>{request.requestedByName || request.requestedBy}</TableCell>
                      <TableCell>{request.requestedFromName || request.requestedFrom}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.status === "completed"
                              ? "default"
                              : request.status === "disputed"
                                ? "destructive"
                                : request.status === "cancelled"
                                  ? "secondary"
                                  : "outline"
                          }
                        >
                          {request.status || "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">
                        {request.completedAt ? new Date(request.completedAt).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {request.status !== "completed" && request.status !== "cancelled" && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkCompleted(request.id)}>
                              Mark Complete
                            </Button>
                          )}

                          {request.status === "disputed" && (
                            <Button size="sm" variant="outline" onClick={() => handleResolveDispute(request.id)}>
                              Resolve
                            </Button>
                          )}

                          {request.status !== "disputed" && request.status !== "cancelled" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  Dispute
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogTitle>Mark as Disputed</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to mark this request as disputed?
                                </AlertDialogDescription>
                                <div className="flex gap-2 justify-end">
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleMarkDisputed(request.id, "Admin marked as disputed")}
                                  >
                                    Mark Disputed
                                  </AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {request.status !== "cancelled" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  Cancel
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogTitle>Cancel Request</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel this request?
                                </AlertDialogDescription>
                                <div className="flex gap-2 justify-end">
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleCancelRequest(request.id)}>
                                    Cancel Request
                                  </AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredRequests.length} of {requests.length} requests
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
