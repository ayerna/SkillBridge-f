"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Mail, Chrome } from "lucide-react"
import { initializeAdminAccount } from "@/app/actions/admin-actions"

const ADMIN_EMAIL = "gladwin.xi.nm@gmail.com"
const ADMIN_PASSWORD = "admin@123"

const TEST_ACCOUNTS = [
  { email: "test1@test.com", password: "test@123" },
  { email: "test2@test.com", password: "test@123" },
]

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const isTestAccount = (testEmail: string) => {
    return TEST_ACCOUNTS.some((acc) => acc.email === testEmail)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        await initializeAdminAccount()
        localStorage.setItem("adminSession", "true")
        router.push("/admin")
        return
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      if (!isTestAccount(email) && email !== ADMIN_EMAIL) {
        const { generateOTP, storeOTP } = await import("@/lib/otp-service")
        const { sendOTPEmail } = await import("@/lib/email-service")

        const otp = generateOTP()
        await storeOTP(email, otp)
        await sendOTPEmail(email, otp)

        router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}&userId=${user.uid}&isLogin=true`)
        return
      }

      // Test accounts and admin skip OTP
      router.push("/dashboard")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError("")

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      if (!user.email?.endsWith("@srmist.edu.in")) {
        await auth.signOut()
        setError("Only @srmist.edu.in email addresses are allowed. Please sign in with your SRM email.")
        return
      }

      const { generateOTP, storeOTP } = await import("@/lib/otp-service")
      const { sendOTPEmail } = await import("@/lib/email-service")

      const otp = generateOTP()
      await storeOTP(user.email, otp)
      await sendOTPEmail(user.email, otp)

      router.push(`/auth/verify-otp?email=${encodeURIComponent(user.email)}&userId=${user.uid}&isLogin=true`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your SkillBridge account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="text-xs">
                <Mail className="h-4 w-4 mr-1" />
                Email
              </TabsTrigger>
              <TabsTrigger value="google" className="text-xs">
                <Chrome className="h-4 w-4 mr-1" />
                Google
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="google" className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Sign in with your Google account to get started quickly.
                </p>

                <Button
                  onClick={handleGoogleSignIn}
                  className="w-full bg-transparent"
                  disabled={loading}
                  variant="outline"
                >
                  <Chrome className="h-4 w-4 mr-2" />
                  {loading ? "Signing In..." : "Sign In with Google"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-center text-sm">
            {"Don't have an account? "}
            <Link href="/auth/signup" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
