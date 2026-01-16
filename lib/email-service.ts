/**
 * Email Service - Stub Implementation
 * 
 * TODO: Remove - Neon Auth handles email and OTP
 * Neon Auth provides email functionality including:
 * - Email/password authentication
 * - Magic links
 * - Email OTP verification
 * - Password reset emails
 */

export const emailService = {
  async sendEmail(to: string, subject: string, body: string) {
    console.warn("emailService.sendEmail: Neon Auth handles email")
    throw new Error("Use Neon Auth for email functionality")
  },
  
  async sendOTP(email: string, code: string) {
    console.warn("emailService.sendOTP: Neon Auth handles OTP")
    throw new Error("Use Neon Auth for OTP functionality")
  },
  
  async sendSecurityAlertEmail(email: string, message: string) {
    console.warn("emailService.sendSecurityAlertEmail: Neon Auth handles security emails")
    throw new Error("Use Neon Auth for security emails")
  },
  
  async verifyEmail(token: string) {
    console.warn("emailService.verifyEmail: Neon Auth handles email verification")
    throw new Error("Use Neon Auth for email verification")
  }
}
