"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SkillOfferModal } from "@/components/skill-offer-modal"
import { SkillRequestModal } from "@/components/skill-request-modal"
import { SkillCard } from "@/components/skill-card"
import { RatingModal } from "@/components/rating-modal"
import { MessageRequestModal } from "@/components/message-request-modal"
import { Search, Filter, Sparkles, Users, BookOpen, MessageSquare, TrendingUp } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

const skillCategories = [
  "All Categories",
  "Programming",
  "Design",
  "Academics",
  "Soft Skills",
  "Languages",
  "Music",
  "Sports",
  "Other",
]

interface SkillOffer {
  id: string
  skillName: string
  description: string
  tags: string[]
  availability: string
  category: string
  level: string
  userName: string
  department: string
  userRating: number
  userId: string
  createdAt: string
  status: string
}

interface SkillRequest {
  id: string
  topic: string
  description: string
  urgency: string
  category: string
  preferredLevel: string
  userName: string
  department: string
  userRating: number
  userId: string
  createdAt: string
  status: string
}

export default function DashboardPage() {
  const { user, profile, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [offers, setOffers] = useState<SkillOffer[]>([])
  const [requests, setRequests] = useState<SkillRequest[]>([])
  const [filteredOffers, setFilteredOffers] = useState<SkillOffer[]>([])
  const [filteredRequests, setFilteredRequests] = useState<SkillRequest[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All Categories")
  const [urgencyFilter, setUrgencyFilter] = useState("All")
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [showMessageRequestModal, setShowMessageRequestModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedUserName, setSelectedUserName] = useState("")
  const [activeTab, setActiveTab] = useState<"offers" | "requests">("offers")
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!loading) {
      if (isAdmin) {
        router.push("/admin")
        return
      }
      if (!user) {
        router.push("/")
        return
      }
      if (profile && !profile.emailVerified) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(user.email || "")}&userId=${user.uid}`)
        return
      }
    }
  }, [user, loading, isAdmin, profile, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      setDataLoading(true)
      try {
        console.log("Fetching skills data...")

        // Fetch ALL skill offers without any filters
        const offersSnapshot = await getDocs(collection(db, "skill_offers"))
        console.log("Offers snapshot size:", offersSnapshot.size)

        const offersData = offersSnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
          }
        }) as SkillOffer[]

        // Filter out inactive/deleted offers and sort on client side
        const activeOffers = offersData
          .filter((offer) => offer.status === "active" || !offer.status) // Include offers without status field
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 100) // Limit to 100 most recent

        console.log("Processed offers:", activeOffers.length)
        setOffers(activeOffers)

        // Fetch ALL skill requests without any filters
        const requestsSnapshot = await getDocs(collection(db, "skill_requests"))
        console.log("Requests snapshot size:", requestsSnapshot.size)

        const requestsData = requestsSnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
          }
        }) as SkillRequest[]

        // Filter out inactive/deleted requests and sort on client side
        const activeRequests = requestsData
          .filter((request) => request.status === "active" || !request.status) // Include requests without status field
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 100) // Limit to 100 most recent

        console.log("Processed requests:", activeRequests.length)
        setRequests(activeRequests)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setDataLoading(false)
      }
    }

    fetchData()
  }, [user])

  useEffect(() => {
    let filtered = offers

    if (searchTerm) {
      filtered = filtered.filter(
        (offer) =>
          offer.skillName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          offer.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          offer.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
          offer.userName?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (categoryFilter !== "All Categories") {
      filtered = filtered.filter((offer) => offer.category === categoryFilter)
    }

    setFilteredOffers(filtered)
  }, [searchTerm, categoryFilter, offers])

  useEffect(() => {
    let filtered = requests

    if (searchTerm) {
      filtered = filtered.filter(
        (request) =>
          request.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          request.userName?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (categoryFilter !== "All Categories") {
      filtered = filtered.filter((request) => request.category === categoryFilter)
    }

    if (urgencyFilter !== "All") {
      filtered = filtered.filter((request) => request.urgency === urgencyFilter)
    }

    setFilteredRequests(filtered)
  }, [searchTerm, categoryFilter, urgencyFilter, requests])

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleContactUser = (userId: string, userName: string) => {
    if (userId === user?.uid) return

    setSelectedUserId(userId)
    setSelectedUserName(userName)
    setShowMessageRequestModal(true)
  }

  const handleRateUser = (userId: string, userName: string) => {
    setSelectedUserId(userId)
    setSelectedUserName(userName)
    setShowRatingModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground">Loading SkillBridge...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const departments = Array.from(
    new Set([...offers.map((o) => o.department), ...requests.map((r) => r.department)]),
  ).filter(Boolean)

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
                  Welcome back, {profile?.name || user.email?.split("@")[0]}! 👋
                </h1>
              </div>
              <ThemeToggle />
            </div>
          </header>

          <div className="p-6 space-y-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 p-8 text-white">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10 max-w-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-6 w-6" />
                  <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                    Student Collaboration Platform
                  </span>
                </div>
                <h2 className="text-3xl font-bold mb-4">Share Knowledge, Build Connections</h2>
                <p className="text-blue-100 mb-6 text-lg">
                  Connect with fellow students to exchange skills, learn together, and grow your academic network.
                </p>
                <div className="flex gap-4">
                  <Button onClick={() => setShowOfferModal(true)} className="bg-white text-blue-600 hover:bg-blue-50">
                    Share a Skill
                  </Button>
                  <Button
                    onClick={() => setShowRequestModal(true)}
                    variant="outline"
                    className="border-white text-white hover:bg-white/10"
                  >
                    Request Help
                  </Button>
                </div>
              </div>
              <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/10"></div>
              <div className="absolute -right-32 -bottom-32 h-64 w-64 rounded-full bg-white/5"></div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-500 text-white">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{offers.length}</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Skills Available</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-500 text-white">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">{requests.length}</p>
                      <p className="text-sm text-green-600 dark:text-green-400">Help Requests</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-purple-500 text-white">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{departments.length}</p>
                      <p className="text-sm text-purple-600 dark:text-purple-400">Departments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-orange-500 text-white">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        {profile?.skillContributions || 0}
                      </p>
                      <p className="text-sm text-orange-600 dark:text-orange-400">Your Contributions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Advanced Search and Filters */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search skills, topics, users, or descriptions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full lg:w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {skillCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeTab === "requests" && (
                    <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                      <SelectTrigger className="w-full lg:w-32">
                        <SelectValue placeholder="Urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="High">🔴 High</SelectItem>
                        <SelectItem value="Medium">🟡 Medium</SelectItem>
                        <SelectItem value="Low">🟢 Low</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tab Navigation */}
            <div className="flex gap-2">
              <Button
                variant={activeTab === "offers" ? "default" : "outline"}
                onClick={() => setActiveTab("offers")}
                className={activeTab === "offers" ? "bg-gradient-to-r from-blue-500 to-purple-600" : ""}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Skill Offers ({filteredOffers.length})
              </Button>
              <Button
                variant={activeTab === "requests" ? "default" : "outline"}
                onClick={() => setActiveTab("requests")}
                className={activeTab === "requests" ? "bg-gradient-to-r from-green-500 to-blue-600" : ""}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Help Requests ({filteredRequests.length})
              </Button>
            </div>

            {/* Loading State */}
            {dataLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading skills...</p>
              </div>
            )}

            {/* Content Grid */}
            {!dataLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTab === "offers" ? (
                  filteredOffers.length > 0 ? (
                    filteredOffers.map((offer) => (
                      <SkillCard
                        key={offer.id}
                        type="offer"
                        title={offer.skillName}
                        description={offer.description}
                        userName={offer.userName}
                        department={offer.department}
                        userRating={offer.userRating || 0}
                        category={offer.category}
                        level={offer.level}
                        tags={offer.tags}
                        availability={offer.availability}
                        createdAt={offer.createdAt}
                        onContact={() => handleContactUser(offer.userId, offer.userName)}
                      />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No skill offers found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchTerm || categoryFilter !== "All Categories"
                          ? "Try adjusting your filters"
                          : "Be the first to share your skills!"}
                      </p>
                      <Button onClick={() => setShowOfferModal(true)}>Share Your First Skill</Button>
                    </div>
                  )
                ) : filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <SkillCard
                      key={request.id}
                      type="request"
                      title={request.topic}
                      description={request.description}
                      userName={request.userName}
                      department={request.department}
                      userRating={request.userRating || 0}
                      category={request.category}
                      urgency={request.urgency}
                      preferredLevel={request.preferredLevel}
                      createdAt={request.createdAt}
                      onContact={() => handleContactUser(request.userId, request.userName)}
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No help requests found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || categoryFilter !== "All Categories" || urgencyFilter !== "All"
                        ? "Try adjusting your filters"
                        : "Be the first to request help!"}
                    </p>
                    <Button onClick={() => setShowRequestModal(true)}>Request Help</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <SkillOfferModal open={showOfferModal} onOpenChange={setShowOfferModal} onSuccess={handleRefresh} />
        <SkillRequestModal open={showRequestModal} onOpenChange={setShowRequestModal} onSuccess={handleRefresh} />
        <RatingModal
          open={showRatingModal}
          onOpenChange={setShowRatingModal}
          targetUserId={selectedUserId}
          targetUserName={selectedUserName}
          onSuccess={() => {
            setShowRatingModal(false)
            handleRefresh()
          }}
        />
        <MessageRequestModal
          open={showMessageRequestModal}
          onOpenChange={setShowMessageRequestModal}
          targetUserId={selectedUserId}
          targetUserName={selectedUserName}
          onSuccess={() => setShowMessageRequestModal(false)}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}
