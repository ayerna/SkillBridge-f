// Email OTP sending service using SendGrid
export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  try {
    const response = await fetch("/api/send-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
    })

    if (!response.ok) {
      throw new Error("Failed to send OTP email")
    }
  } catch (error) {
    console.error("[v0] Error sending OTP email:", error)
    throw error
  }
}
