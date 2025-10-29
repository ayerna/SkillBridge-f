"use server"

import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"

const ADMIN_EMAIL = "admin@admin.com"

export async function initializeAdminAccount() {
  try {
    const adminRef = doc(db, "users", "admin-account")
    const adminSnap = await getDoc(adminRef)

    if (!adminSnap.exists()) {
      await setDoc(adminRef, {
        name: "Administrator",
        email: ADMIN_EMAIL,
        department: "Admin",
        year: "N/A",
        skills: [],
        rating: 5,
        totalRatings: 0,
        skillContributions: 0,
        badges: ["admin"],
        createdAt: new Date().toISOString(),
        role: "admin",
        emailVerified: true,
        verifiedAt: new Date().toISOString(),
      })
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Error initializing admin account:", error)
    return { success: false, error: String(error) }
  }
}
