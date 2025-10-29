import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 })
    }

    const sendgridApiKey = process.env.SENDGRID_API_KEY
    if (!sendgridApiKey) {
      console.error("[v0] SENDGRID_API_KEY not configured")
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 })
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email }],
            subject: "Your SkillBridge Email Verification Code",
          },
        ],
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || "noreply@skillbridge.com",
          name: "SkillBridge",
        },
        content: [
          {
            type: "text/html",
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">SkillBridge</h1>
                </div>
                <div style="background: #f9fafb; padding: 40px; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #1f2937; margin-top: 0;">Email Verification</h2>
                  <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                    Your verification code is:
                  </p>
                  <div style="background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                    <p style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 0;">
                      ${otp}
                    </p>
                  </div>
                  <p style="color: #6b7280; font-size: 14px;">
                    This code will expire in 5 minutes. Do not share this code with anyone.
                  </p>
                  <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
                    If you didn't request this code, please ignore this email.
                  </p>
                </div>
              </div>
            `,
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("[v0] SendGrid error:", error)
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in send-otp route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
