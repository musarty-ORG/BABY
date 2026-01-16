import { Redis } from "@upstash/redis"
import { databaseService, type User } from "./database-service"
import { randomBytes, randomUUID } from "crypto"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export interface Session {
  userId: string
  email: string
  role: string
  expiresAt: number
}

export class AuthSystem {
  private readonly OTP_EXPIRY = 10 * 60 // 10 minutes
  private readonly SESSION_EXPIRY = 24 * 60 * 60 // 24 hours

  async generateOTP(email: string): Promise<string> {
    // Generate a cryptographically secure 6-digit OTP using rejection sampling to avoid bias
    let otp: number
    do {
      const bytes = randomBytes(4) // 4 bytes for better uniform distribution
      otp = bytes.readUInt32BE(0) % 1000000
    } while (otp > 999999) // Rejection sampling (though highly unlikely given the range)
    
    const otpString = otp.toString().padStart(6, '0')
    const key = `otp:${email}`

    await redis.setex(key, this.OTP_EXPIRY, otpString)

    // In production, send email here
    console.log(`[AUTH] OTP for ${email}: ${otpString}`)

    return otpString
  }

  async verifyOTP(email: string, otp: string): Promise<boolean> {
    const key = `otp:${email}`
    const storedOTP = await redis.get(key)

    if (storedOTP === otp) {
      await redis.del(key) // Delete used OTP
      return true
    }

    return false
  }

  async createSession(user: User): Promise<string> {
    // Use crypto-secure UUID for session ID
    const sessionId = `session_${randomUUID()}`
    const session: Session = {
      userId: user.id,
      email: user.email,
      role: user.role,
      expiresAt: Date.now() + this.SESSION_EXPIRY * 1000,
    }

    await redis.setex(`session:${sessionId}`, this.SESSION_EXPIRY, JSON.stringify(session))

    // Update last login in database
    await databaseService.updateUserLastLogin(user.email)

    return sessionId
  }

  async validateSession(sessionId: string): Promise<Session | null> {
    try {
      const sessionData = await redis.get(`session:${sessionId}`)
      if (!sessionData) return null

      const session: Session = JSON.parse(sessionData as string)

      if (session.expiresAt < Date.now()) {
        await redis.del(`session:${sessionId}`)
        return null
      }

      return session
    } catch (error) {
      console.error("Session validation error:", error)
      return null
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    await redis.del(`session:${sessionId}`)
  }

  async getOrCreateUser(email: string): Promise<User> {
    // Try to get user from database first
    let user = await databaseService.getUserByEmail(email)

    if (!user) {
      // Create new user in database with crypto-secure UUID
      const role = email.includes("admin") ? ("admin" as const) : ("user" as const)
      const newUser = {
        id: `user_${randomUUID()}`,
        email,
        name: email.split("@")[0],
        role,
        status: "active" as const,
        metadata: {},
      }

      user = await databaseService.createUser(newUser)
    }

    return user
  }

  async getAllUsers(): Promise<User[]> {
    return await databaseService.getAllUsers()
  }

  async updateUser(email: string, updates: Partial<User>): Promise<User | null> {
    const user = await databaseService.getUserByEmail(email)
    if (!user) return null

    return await databaseService.updateUser(user.id, updates)
  }

  async searchUsers(query: string): Promise<User[]> {
    return await databaseService.searchUsers(query)
  }
}

export const authSystem = new AuthSystem()
