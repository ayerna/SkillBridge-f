"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { Chrome, Loader2, Eye, EyeOff } from "lucide-react"

const departments = [
  "Computer Science",
  "Engineering",
  "Business",
  "Arts & Design",
  "Sciences",
  "Mathematics",
  "Languages",
  "Social Sciences",
  "Other",
]

const years = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduate", "PhD"]

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    department: "",
    year: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const createUserProfile = async (userId: string, userData: any) => {
    await setDoc(doc(db, "users", userId), {
      name: userData.name,
      email: userData.email,
      department: userData.department || "Not specified",
      year: userData.year || "Not specified",
      skills: [],
      rating: 0,
      totalRatings: 0,
      skillContributions: 0,
      badges: [],
      createdAt: new Date().toISOString(),
      emailVerified: userData.emailVerified || false,
    })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const isValidEmail = formData.email.endsWith("@srmist.edu.in") || formData.email.endsWith("@admin.com")
    if (!isValidEmail) {
      setError("Only @srmist.edu.in or @admin.com email addresses are allowed.")
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user

      const isAdminEmail = formData.email.endsWith("@admin.com")

      await createUserProfile(user.uid, {
        ...formData,
        emailVerified: isAdminEmail, // Auto-verify admin emails
      })

      if (isAdminEmail) {
        // Admin users skip OTP and go directly to dashboard
        router.push("/dashboard")
      } else {
        // Regular users go through OTP verification
        const { generateOTP, storeOTP } = await import("@/lib/otp-service")
        const { sendOTPEmail } = await import("@/lib/email-service")

        const otp = generateOTP()
        await storeOTP(formData.email, otp)
        await sendOTPEmail(formData.email, otp)

        router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}&userId=${user.uid}`)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true)
    setError("")

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      const isValidEmail = user.email?.endsWith("@srmist.edu.in") || user.email?.endsWith("@admin.com")
      if (!isValidEmail) {
        await auth.signOut()
        setError("Only @srmist.edu.in or @admin.com email addresses are allowed.")
        return
      }

      const userRef = doc(db, "users", user.uid)
      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        const isAdminEmail = user.email?.endsWith("@admin.com")

        await createUserProfile(user.uid, {
          name: user.displayName || "User",
          email: user.email || "",
          department: "",
          year: "",
          emailVerified: isAdminEmail, // Auto-verify admin emails
        })

        if (isAdminEmail) {
          // Admin users skip OTP and go directly to dashboard
          router.push("/dashboard")
        } else {
          // Regular users go through OTP verification
          const { generateOTP, storeOTP } = await import("@/lib/otp-service")
          const { sendOTPEmail } = await import("@/lib/email-service")

          const otp = generateOTP()
          await storeOTP(user.email, otp)
          await sendOTPEmail(user.email, otp)

          router.push(`/auth/verify-email?email=${encodeURIComponent(user.email)}&userId=${user.uid}`)
        }
        return
      }

      router.push("/dashboard")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg mx-auto mb-4">
            SB
          </div>
          <CardTitle className="text-2xl">Join SkillBridge</CardTitle>
          <CardDescription>Create your account to start sharing skills</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Button
              onClick={handleGoogleSignUp}
              className="w-full bg-transparent"
              disabled={googleLoading}
              variant="outline"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing up...
                </>
              ) : (
                <>
                  <Chrome className="h-4 w-4 mr-2" />
                  Sign up with Google
                </>
              )}
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300 dark:border-gray-600"></span>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-slate-950 text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select onValueChange={(value) => setFormData((prev) => ({ ...prev, department: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Select onValueChange={(value) => setFormData((prev) => ({ ...prev, year: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              disabled={loading || !formData.department || !formData.year}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
