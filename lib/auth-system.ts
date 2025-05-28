import { Redis } from "@upstash/redis"
import { databaseService, type User } from "./database-service"
import { createJWT, verifyJWT, type JWTPayload } from "./jwt-utils"

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
    const otp = Math.random().toString().slice(2, 8).padStart(6, "0")
    const key = `otp:${email}`

    await redis.setex(key, this.OTP_EXPIRY, otp)

    // In production, send email here
    console.log(`[AUTH] OTP for ${email}: ${otp}`)

    return otp
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
    // Create a JWT token
    const token = await createJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    })

    // Store session metadata in Redis for potential revocation
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const session: Session = {
      userId: user.id,
      email: user.email,
      role: user.role,
      expiresAt: Date.now() + this.SESSION_EXPIRY * 1000,
    }

    await redis.setex(`session:${sessionId}`, this.SESSION_EXPIRY, JSON.stringify(session))

    // Store JWT reference for potential revocation
    await redis.setex(`jwt:${user.id}:${sessionId}`, this.SESSION_EXPIRY, "active")

    // Update last login in database
    await databaseService.updateUserLastLogin(user.email)

    return token
  }

  async validateSession(token: string): Promise<JWTPayload | null> {
    try {
      // Verify JWT token
      const payload = await verifyJWT(token)
      if (!payload) return null

      // Check if token has been revoked
      const isRevoked = await this.isTokenRevoked(payload.userId)
      if (isRevoked) return null

      return payload
    } catch (error) {
      console.error("Session validation error:", error)
      return null
    }
  }

  async isTokenRevoked(userId: string): Promise<boolean> {
    // Check global revocation list
    const isRevoked = await redis.get(`revoked:user:${userId}`)
    return !!isRevoked
  }

  async destroySession(token: string): Promise<void> {
    try {
      // Verify JWT token
      const payload = await verifyJWT(token)
      if (!payload) return

      // Add to revocation list
      await redis.setex(`revoked:user:${payload.userId}`, this.SESSION_EXPIRY, "revoked")

      // Clean up any Redis session data
      const keys = await redis.keys(`jwt:${payload.userId}:*`)
      if (keys.length > 0) {
        await Promise.all(keys.map((key) => redis.del(key)))
      }
    } catch (error) {
      console.error("Error destroying session:", error)
    }
  }

  async getOrCreateUser(email: string): Promise<User> {
    // Try to get user from database first
    let user = await databaseService.getUserByEmail(email)

    if (!user) {
      // Create new user in database
      const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        name: email.split("@")[0],
        role: email.includes("admin") ? "admin" : ("user" as const),
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
