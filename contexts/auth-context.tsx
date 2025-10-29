"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { type User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth"
import { doc, getDoc, onSnapshot } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

interface UserProfile {
  name: string
  email: string
  department: string
  year: string
  skills: string[]
  profilePicture?: string
  rating: number
  totalRatings: number
  skillContributions: number
  badges: string[]
  createdAt: string
  role?: "user" | "admin"
  emailVerified: boolean
  verifiedAt?: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => void
  isAdmin: boolean
  isEmailVerified: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: () => {},
  isAdmin: false,
  isEmailVerified: false,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      if (!user) {
        setProfile(null)
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined

    if (user) {
      const profileRef = doc(db, "users", user.uid)
      unsubscribeProfile = onSnapshot(profileRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserProfile
          setProfile(data)
        }
        setLoading(false)
      })
    }

    return () => {
      if (unsubscribeProfile) {
        unsubscribeProfile()
      }
    }
  }, [user])

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  const refreshProfile = async () => {
    if (user) {
      const docRef = doc(db, "users", user.uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile)
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signOut,
        refreshProfile,
        isAdmin: profile?.role === "admin",
        isEmailVerified: profile?.emailVerified || false,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
