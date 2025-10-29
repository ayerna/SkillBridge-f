import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore"

interface OTPData {
  code: string
  email: string
  createdAt: number
  expiresAt: number
}

// Generate a random 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Store OTP in Firestore with 5-minute expiry
export async function storeOTP(email: string, code: string): Promise<void> {
  const now = Date.now()
  const expiresAt = now + 5 * 60 * 1000 // 5 minutes

  const otpRef = doc(db, "otps", email)
  await setDoc(otpRef, {
    code,
    email,
    createdAt: now,
    expiresAt,
  } as OTPData)
}

// Verify OTP
export async function verifyOTP(email: string, code: string): Promise<boolean> {
  const otpRef = doc(db, "otps", email)
  const otpSnap = await getDoc(otpRef)

  if (!otpSnap.exists()) {
    return false
  }

  const otpData = otpSnap.data() as OTPData

  // Check if OTP has expired
  if (Date.now() > otpData.expiresAt) {
    await deleteDoc(otpRef)
    return false
  }

  // Check if code matches
  if (otpData.code !== code) {
    return false
  }

  // Delete OTP after successful verification
  await deleteDoc(otpRef)
  return true
}

// Get remaining time for OTP (in seconds)
export async function getOTPRemainingTime(email: string): Promise<number> {
  const otpRef = doc(db, "otps", email)
  const otpSnap = await getDoc(otpRef)

  if (!otpSnap.exists()) {
    return 0
  }

  const otpData = otpSnap.data() as OTPData
  const remaining = Math.max(0, Math.ceil((otpData.expiresAt - Date.now()) / 1000))
  return remaining
}

// Check if OTP exists for email
export async function otpExists(email: string): Promise<boolean> {
  const otpRef = doc(db, "otps", email)
  const otpSnap = await getDoc(otpRef)
  return otpSnap.exists()
}
