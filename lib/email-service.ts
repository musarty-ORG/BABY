import nodemailer from "nodemailer"
import { databaseService } from "./database-service"

interface EmailOptions {
  to: string
  subject: string
  html: string
}

interface OtpEmailOptions {
  to: string
  otp: string
}

interface WelcomeEmailOptions {
  to: string
  username: string
}

interface SecurityAlertEmailOptions {
  to: string
  location: string
  time: string
}

class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number.parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
      })

      console.log("Message sent: %s", info.messageId)
      return true
    } catch (error: any) {
      console.error("Error sending email:", error)
      return false
    }
  }

  async sendOtpEmail(options: OtpEmailOptions): Promise<boolean> {
    const { to, otp } = options
    const subject = "Your OTP"
    const html = `
      <p>Your OTP is: <b>${otp}</b></p>
    `

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: to,
        subject: subject,
        html: html,
      })

      console.log("OTP Email sent: %s", info.messageId)

      // Log email to database
      await databaseService.logEmail({
        recipient_email: to,
        subject: subject,
        template_name: "otp", // or 'welcome', 'security_alert'
        status: "sent",
        provider_message_id: info?.messageId,
        error_message: null,
        metadata: { otp: otp.substring(0, 2) + "****" }, // Don't log full OTP
      })

      return true
    } catch (error: any) {
      console.error("Error sending OTP email:", error)

      // Log email to database
      await databaseService.logEmail({
        recipient_email: to,
        subject: subject,
        template_name: "otp", // or 'welcome', 'security_alert'
        status: "failed",
        provider_message_id: info?.messageId,
        error_message: error?.message,
        metadata: { otp: otp.substring(0, 2) + "****" }, // Don't log full OTP
      })

      return false
    }
  }

  async sendWelcomeEmail(options: WelcomeEmailOptions): Promise<boolean> {
    const { to, username } = options
    const subject = "Welcome!"
    const html = `
      <p>Welcome, ${username}!</p>
    `

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: to,
        subject: subject,
        html: html,
      })

      console.log("Welcome Email sent: %s", info.messageId)

      // Log email to database
      await databaseService.logEmail({
        recipient_email: to,
        subject: subject,
        template_name: "welcome", // or 'welcome', 'security_alert'
        status: "sent",
        provider_message_id: info?.messageId,
        error_message: null,
        metadata: {},
      })

      return true
    } catch (error: any) {
      console.error("Error sending welcome email:", error)

      // Log email to database
      await databaseService.logEmail({
        recipient_email: to,
        subject: subject,
        template_name: "welcome", // or 'welcome', 'security_alert'
        status: "failed",
        provider_message_id: info?.messageId,
        error_message: error?.message,
        metadata: {},
      })

      return false
    }
  }

  async sendSecurityAlertEmail(options: SecurityAlertEmailOptions): Promise<boolean> {
    const { to, location, time } = options
    const subject = "Security Alert"
    const html = `
      <p>Suspicious activity detected from ${location} at ${time}.</p>
    `

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: to,
        subject: subject,
        html: html,
      })

      console.log("Security Alert Email sent: %s", info.messageId)

      // Log email to database
      await databaseService.logEmail({
        recipient_email: to,
        subject: subject,
        template_name: "security_alert", // or 'welcome', 'security_alert'
        status: "sent",
        provider_message_id: info?.messageId,
        error_message: null,
        metadata: { location: location, time: time },
      })

      return true
    } catch (error: any) {
      console.error("Error sending security alert email:", error)

      // Log email to database
      await databaseService.logEmail({
        recipient_email: to,
        subject: subject,
        template_name: "security_alert", // or 'welcome', 'security_alert'
        status: "failed",
        provider_message_id: info?.messageId,
        error_message: error?.message,
        metadata: { location: location, time: time },
      })

      return false
    }
  }
}

export const emailService = new EmailService()
