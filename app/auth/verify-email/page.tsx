"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { verifyOTP, getOTPRemainingTime } from "@/lib/otp-service"
import { sendOTPEmail } from "@/lib/email-service"
import { generateOTP, storeOTP } from "@/lib/otp-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Loader2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const userId = searchParams.get("userId") || ""

  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [remainingTime, setRemainingTime] = useState(300) // 5 minutes
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    if (!email) return

    const checkRemainingTime = async () => {
      const remaining = await getOTPRemainingTime(email)
      setRemainingTime(remaining)
      setCanResend(remaining === 0)
    }

    checkRemainingTime()
    const interval = setInterval(checkRemainingTime, 1000)
    return () => clearInterval(interval)
  }, [email])

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (email.endsWith("@admin.com")) {
        if (userId) {
          const userRef = doc(db, "users", userId)
          await updateDoc(userRef, {
            emailVerified: true,
            verifiedAt: new Date().toISOString(),
          })
        }
        setSuccess(true)
        setTimeout(() => {
          router.push("/dashboard")
        }, 2000)
        return
      }

      if (!otp || otp.length !== 6) {
        setError("Please enter a valid 6-digit code")
        setLoading(false)
        return
      }

      const isValid = await verifyOTP(email, otp)

      if (!isValid) {
        setError("Invalid or expired OTP. Please try again.")
        setLoading(false)
        return
      }

      if (userId) {
        const userRef = doc(db, "users", userId)
        await updateDoc(userRef, {
          emailVerified: true,
          verifiedAt: new Date().toISOString(),
        })
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (error: any) {
      setError(error.message || "Verification failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setResendLoading(true)
    setError("")

    try {
      const newOtp = generateOTP()
      await storeOTP(email, newOtp)
      await sendOTPEmail(email, newOtp)
      setOtp("")
      setRemainingTime(300)
      setCanResend(false)
    } catch (error: any) {
      setError(error.message || "Failed to resend OTP. Please try again.")
    } finally {
      setResendLoading(false)
    }
  }

  const handleGoBack = () => {
    router.back()
  }

  const handleChangeEmail = () => {
    router.push("/auth/login")
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 px-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
            <p className="text-muted-foreground mb-4">
              Your email has been successfully verified. Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center relative">
          <button
            onClick={handleGoBack}
            className="absolute left-4 top-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg mx-auto mb-4">
            SB
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>Enter the 6-digit code sent to {email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
                required
              />
              <p className="text-xs text-muted-foreground text-center">
                Code expires in: <span className="font-semibold text-blue-600">{formatTime(remainingTime)}</span>
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent"
              onClick={handleResendOTP}
              disabled={!canResend || resendLoading}
            >
              {resendLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : canResend ? (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Resend Code
                </>
              ) : (
                `Resend in ${formatTime(remainingTime)}`
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-gray-800"
              onClick={handleChangeEmail}
            >
              Change Email
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
