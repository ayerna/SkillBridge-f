"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SkillOfferModal } from "@/components/skill-offer-modal"
import { SkillRequestModal } from "@/components/skill-request-modal"
import { BookOpen, MessageSquare, Plus, Edit, Trash2 } from "lucide-react"

interface MySkillOffer {
  id: string
  skillName: string
  description: string
  tags: string[]
  availability: string
  category: string
  level: string
  createdAt: string
  status: string
}

interface MySkillRequest {
  id: string
  topic: string
  description: string
  urgency: string
  category: string
  preferredLevel: string
  createdAt: string
  status: string
}

export default function MySkillsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [myOffers, setMyOffers] = useState<MySkillOffer[]>([])
  const [myRequests, setMyRequests] = useState<MySkillRequest[]>([])
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [activeTab, setActiveTab] = useState<"offers" | "requests">("offers")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchMySkills = async () => {
      if (!user) return

      try {
        // Fetch my skill offers
        const offersQuery = query(collection(db, "skill_offers"), where("userId", "==", user.uid))
        const offersSnapshot = await getDocs(offersQuery)
        const offersData = offersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MySkillOffer[]

        // Sort by createdAt on client side
        offersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setMyOffers(offersData)

        // Fetch my skill requests
        const requestsQuery = query(collection(db, "skill_requests"), where("userId", "==", user.uid))
        const requestsSnapshot = await getDocs(requestsQuery)
        const requestsData = requestsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MySkillRequest[]

        // Sort by createdAt on client side
        requestsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setMyRequests(requestsData)
      } catch (error) {
        console.error("Error fetching my skills:", error)
      }
    }

    fetchMySkills()
  }, [user])

  const handleRefresh = () => {
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) return null

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
                  My Skills
                </h1>
              </div>
            </div>
          </header>

          <div className="p-6 space-y-6">
            {/* Quick Actions */}
            <div className="flex gap-4">
              <Button
                onClick={() => setShowOfferModal(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Skill Offer
              </Button>
              <Button onClick={() => setShowRequestModal(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Help Request
              </Button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2">
              <Button
                variant={activeTab === "offers" ? "default" : "outline"}
                onClick={() => setActiveTab("offers")}
                className={activeTab === "offers" ? "bg-gradient-to-r from-blue-500 to-purple-600" : ""}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                My Skill Offers ({myOffers.length})
              </Button>
              <Button
                variant={activeTab === "requests" ? "default" : "outline"}
                onClick={() => setActiveTab("requests")}
                className={activeTab === "requests" ? "bg-gradient-to-r from-green-500 to-blue-600" : ""}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                My Help Requests ({myRequests.length})
              </Button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTab === "offers" ? (
                myOffers.length > 0 ? (
                  myOffers.map((offer) => (
                    <Card key={offer.id} className="border-0 shadow-md">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{offer.skillName}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {offer.category}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {offer.level}
                              </Badge>
                            </CardDescription>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{offer.description}</p>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            <strong>Availability:</strong> {offer.availability}
                          </p>
                          {offer.tags && offer.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {offer.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Created {new Date(offer.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No skill offers yet</h3>
                    <p className="text-muted-foreground mb-4">Share your first skill to help other students</p>
                    <Button onClick={() => setShowOfferModal(true)}>Create Your First Offer</Button>
                  </div>
                )
              ) : myRequests.length > 0 ? (
                myRequests.map((request) => (
                  <Card key={request.id} className="border-0 shadow-md">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{request.topic}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {request.category}
                            </Badge>
                            <Badge
                              variant={
                                request.urgency === "High"
                                  ? "destructive"
                                  : request.urgency === "Medium"
                                    ? "default"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {request.urgency}
                            </Badge>
                          </CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{request.description}</p>
                      <div className="space-y-2">
                        {request.preferredLevel && (
                          <p className="text-xs text-muted-foreground">
                            <strong>Preferred Helper Level:</strong> {request.preferredLevel}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No help requests yet</h3>
                  <p className="text-muted-foreground mb-4">Request help with skills you want to learn</p>
                  <Button onClick={() => setShowRequestModal(true)}>Create Your First Request</Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modals */}
        <SkillOfferModal open={showOfferModal} onOpenChange={setShowOfferModal} onSuccess={handleRefresh} />
        <SkillRequestModal open={showRequestModal} onOpenChange={setShowRequestModal} onSuccess={handleRefresh} />
      </SidebarInset>
    </SidebarProvider>
  )
}
