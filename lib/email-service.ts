import nodemailer from "nodemailer"

class EmailService {
  private transporter: any = null
  private isConfigured = false

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    try {
      // Check if email is configured
      if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        this.transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: Number(process.env.EMAIL_PORT || 587),
          secure: process.env.EMAIL_SECURE === "true",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        })
        this.isConfigured = true
        console.log("[EMAIL] Email service configured successfully")
      } else {
        console.log("[EMAIL] Email service not configured - missing credentials")
      }
    } catch (error) {
      console.error("[EMAIL] Failed to initialize email service:", error)
    }
  }

  async sendOTP(email: string, otp: string): Promise<boolean> {
    // If email is not configured, just log and return true
    if (!this.isConfigured || !this.transporter) {
      console.log(`[EMAIL] Would send OTP ${otp} to ${email} (email not configured)`)
      return true
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: "Your Code Homie Verification Code",
        html: this.generateOTPEmailHTML(otp),
        text: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
      }

      const info = await this.transporter.sendMail(mailOptions)
      console.log(`[EMAIL] OTP sent successfully to ${email}: ${info.messageId}`)
      return true
    } catch (error) {
      console.error(`[EMAIL] Failed to send OTP to ${email}:`, error)
      return false
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    // If email is not configured, just log and return true
    if (!this.isConfigured || !this.transporter) {
      console.log(`[EMAIL] Would send welcome email to ${email} (email not configured)`)
      return true
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: "Welcome to Code Homie!",
        html: this.generateWelcomeEmailHTML(name),
        text: `Welcome to Code Homie, ${name}! Your account has been created successfully.`,
      }

      const info = await this.transporter.sendMail(mailOptions)
      console.log(`[EMAIL] Welcome email sent successfully to ${email}: ${info.messageId}`)
      return true
    } catch (error) {
      console.error(`[EMAIL] Failed to send welcome email to ${email}:`, error)
      return false
    }
  }

  async sendSecurityAlert(email: string, action: string, location: string): Promise<boolean> {
    // If email is not configured, just log and return true
    if (!this.isConfigured || !this.transporter) {
      console.log(`[EMAIL] Would send security alert to ${email} (email not configured)`)
      return true
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: "Security Alert - Code Homie",
        html: this.generateSecurityAlertHTML(action, location),
        text: `Security Alert: ${action} from ${location}`,
      }

      const info = await this.transporter.sendMail(mailOptions)
      console.log(`[EMAIL] Security alert sent successfully to ${email}: ${info.messageId}`)
      return true
    } catch (error) {
      console.error(`[EMAIL] Failed to send security alert to ${email}:`, error)
      return false
    }
  }

  private generateOTPEmailHTML(otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your Verification Code</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #000; color: #fff; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 10px; padding: 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8b5cf6; margin: 0;">CODE HOMIE</h1>
              <p style="color: #a855f7; margin: 5px 0;">Your AI Coding Assistant</p>
            </div>
            
            <h2 style="color: #fff; text-align: center;">Verification Code</h2>
            
            <div style="background: #1f2937; border: 2px solid #8b5cf6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <div style="font-size: 32px; font-weight: bold; color: #8b5cf6; letter-spacing: 8px; font-family: monospace;">
                ${otp}
              </div>
            </div>
            
            <p style="color: #d1d5db; text-align: center; margin: 20px 0;">
              Enter this code to complete your verification. This code will expire in 10 minutes.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #374151;">
              <p style="color: #9ca3af; font-size: 14px;">
                If you didn't request this code, please ignore this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  private generateWelcomeEmailHTML(name: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Code Homie!</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #000; color: #fff; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 10px; padding: 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8b5cf6; margin: 0;">CODE HOMIE</h1>
              <p style="color: #a855f7; margin: 5px 0;">Your AI Coding Assistant</p>
            </div>
            
            <h2 style="color: #fff; text-align: center;">Welcome, ${name}! 🚀</h2>
            
            <p style="color: #d1d5db; line-height: 1.6;">
              Your account has been created successfully! You're now ready to start coding with AI assistance.
            </p>
            
            <div style="background: #1f2937; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #8b5cf6; margin-top: 0;">What's Next?</h3>
              <ul style="color: #d1d5db; line-height: 1.8;">
                <li>Start chatting with your AI coding assistant</li>
                <li>Get help with debugging, code reviews, and more</li>
                <li>Explore advanced features in your dashboard</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard" 
                 style="background: linear-gradient(135deg, #8b5cf6, #06b6d4); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Go to Dashboard
              </a>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #374151;">
              <p style="color: #9ca3af; font-size: 14px;">
                Happy coding!<br>
                The Code Homie Team
              </p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  private generateSecurityAlertHTML(action: string, location: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Security Alert</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #000; color: #fff; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 10px; padding: 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #8b5cf6; margin: 0;">CODE HOMIE</h1>
              <p style="color: #a855f7; margin: 5px 0;">Security Alert</p>
            </div>
            
            <h2 style="color: #ef4444; text-align: center;">Security Alert 🔒</h2>
            
            <div style="background: #1f2937; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #d1d5db; margin: 0;">
                <strong>Action:</strong> ${action}<br>
                <strong>Location:</strong> ${location}<br>
                <strong>Time:</strong> ${new Date().toLocaleString()}
              </p>
            </div>
            
            <p style="color: #d1d5db; line-height: 1.6;">
              If this was you, no action is needed. If you don't recognize this activity, 
              please contact our support team immediately.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #374151;">
              <p style="color: #9ca3af; font-size: 14px;">
                Stay secure!<br>
                The Code Homie Team
              </p>
            </div>
          </div>
        </body>
      </html>
    `
  }
}

export const emailService = new EmailService()
