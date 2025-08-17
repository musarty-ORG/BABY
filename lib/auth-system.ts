import { databaseService, type User } from "./database-service"
import { simpleCounter } from "./rate-limiter"

export interface Session {
  userId: string
  email: string
  role: string
  expiresAt: number
}

export class AuthSystem {
  private otpStorage = new Map<string, { otp: string; timestamp: number }>()
  private sessionStorage = new Map<string, Session>()
  private readonly OTP_EXPIRY = 10 * 60 * 1000 // 10 minutes in ms
  private readonly SESSION_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours in ms

  async generateOTP(email: string): Promise<string> {
    const otp = Math.random().toString().slice(2, 8).padStart(6, "0")
    
    // Store OTP with timestamp
    this.otpStorage.set(email, {
      otp,
      timestamp: Date.now()
    })

    // Track OTP generation
    await simpleCounter.incrementCounter(email, simpleCounter.CATEGORIES.LOGINS)

    // In production, send email here
    console.log(`[AUTH] OTP for ${email}: ${otp}`)

    return otp
  }

  async verifyOTP(email: string, otp: string): Promise<boolean> {
    const stored = this.otpStorage.get(email)
    
    if (!stored) {
      return false
    }

    // Check if OTP has expired
    if (Date.now() - stored.timestamp > this.OTP_EXPIRY) {
      this.otpStorage.delete(email)
      return false
    }

    if (stored.otp === otp) {
      this.otpStorage.delete(email) // Delete used OTP
      return true
    }

    return false
  }

  async createSession(user: User): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const session: Session = {
      userId: user.id,
      email: user.email,
      role: user.role,
      expiresAt: Date.now() + this.SESSION_EXPIRY,
    }

    // Store session in memory
    this.sessionStorage.set(sessionId, session)

    // Update last login in database
    await databaseService.updateUserLastLogin(user.email)

    return sessionId
  }

  async validateSession(sessionId: string): Promise<Session | null> {
    try {
      const session = this.sessionStorage.get(sessionId)
      if (!session) return null

      if (session.expiresAt < Date.now()) {
        this.sessionStorage.delete(sessionId)
        return null
      }

      return session
    } catch (error) {
      console.error("Session validation error:", error)
      return null
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    this.sessionStorage.delete(sessionId)
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
