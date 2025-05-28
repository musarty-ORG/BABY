import { neon } from "@neondatabase/serverless"
import jwt from "jsonwebtoken"

const sql = neon(process.env.NEON_NEON_NEON_DATABASE_URL || process.env.NEON_NEON_DATABASE_URL || "")

interface User {
  id: string
  email: string
  name: string | null
  role: string
  tokenBalance: number
  createdAt: Date
  lastLoginAt: Date | null
  status?: "active" | "inactive" | "suspended"
}

interface OTPEntry {
  email: string
  otp: string
  expiresAt: Date
  attempts: number
}

class AuthSystem {
  private otpStore = new Map<string, OTPEntry>()
  private readonly OTP_EXPIRY_MINUTES = 10
  private readonly MAX_OTP_ATTEMPTS = 3
  private readonly JWT_SECRET = process.env.JWT_SECRET || "default-secret-key-for-development-only"
  private readonly JWT_EXPIRY = "30d" // 30 days

  async generateOTP(email: string): Promise<string> {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP with expiry
    this.otpStore.set(email.toLowerCase(), {
      email: email.toLowerCase(),
      otp,
      expiresAt: new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000),
      attempts: 0,
    })

    console.log(`[AUTH] Generated OTP for ${email}: ${otp}`) // For development
    return otp
  }

  async verifyOTP(email: string, otp: string): Promise<boolean> {
    const entry = this.otpStore.get(email.toLowerCase())

    if (!entry) {
      console.log(`[AUTH] No OTP found for ${email}`)
      return false
    }

    // Check if OTP is expired
    if (new Date() > entry.expiresAt) {
      console.log(`[AUTH] OTP expired for ${email}`)
      this.otpStore.delete(email.toLowerCase())
      return false
    }

    // Check if too many attempts
    if (entry.attempts >= this.MAX_OTP_ATTEMPTS) {
      console.log(`[AUTH] Too many OTP attempts for ${email}`)
      this.otpStore.delete(email.toLowerCase())
      return false
    }

    // Increment attempts
    entry.attempts++

    // Check if OTP matches
    if (entry.otp === otp) {
      console.log(`[AUTH] OTP verified for ${email}`)
      this.otpStore.delete(email.toLowerCase()) // Remove OTP after successful verification
      return true
    }

    console.log(`[AUTH] Invalid OTP for ${email}: expected ${entry.otp}, got ${otp}`)
    return false
  }

  async getOrCreateUser(email: string, name?: string): Promise<User> {
    try {
      // Try to get existing user
      const existingUsers = await sql`
        SELECT id, email, name, role, token_balance as "tokenBalance", created_at as "createdAt", last_login_at as "lastLoginAt", status
        FROM users 
        WHERE email = ${email.toLowerCase()}
        LIMIT 1
      `

      if (existingUsers.length > 0) {
        const user = existingUsers[0]

        // Update last login
        await sql`
          UPDATE users 
          SET last_login_at = NOW()
          WHERE id = ${user.id}
        `

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tokenBalance: user.tokenBalance,
          createdAt: new Date(user.createdAt),
          lastLoginAt: new Date(),
          status: user.status,
        }
      }

      // Create new user
      const newUsers = await sql`
        INSERT INTO users (email, name, role, token_balance, created_at, last_login_at, status)
        VALUES (${email.toLowerCase()}, ${name || null}, 'user', 100, NOW(), NOW(), 'active')
        RETURNING id, email, name, role, token_balance as "tokenBalance", created_at as "createdAt", last_login_at as "lastLoginAt", status
      `

      const newUser = newUsers[0]
      return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        tokenBalance: newUser.tokenBalance,
        createdAt: new Date(newUser.createdAt),
        lastLoginAt: new Date(newUser.lastLoginAt),
        status: newUser.status,
      }
    } catch (error) {
      console.error("[AUTH] Database error in getOrCreateUser:", error)
      throw new Error("Failed to get or create user")
    }
  }

  async createSession(user: User): Promise<string> {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
    }

    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRY })
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, this.JWT_SECRET)
    } catch (error) {
      throw new Error("Invalid token")
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const users = await sql`
        SELECT id, email, name, role, token_balance as "tokenBalance", created_at as "createdAt", last_login_at as "lastLoginAt", status
        FROM users 
        WHERE id = ${userId}
        LIMIT 1
      `

      if (users.length === 0) {
        return null
      }

      const user = users[0]
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tokenBalance: user.tokenBalance,
        createdAt: new Date(user.createdAt),
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
        status: user.status,
      }
    } catch (error) {
      console.error("[AUTH] Database error in getUserById:", error)
      return null
    }
  }

  async getAllUsers(limit = 100, offset = 0): Promise<User[]> {
    try {
      const users = await sql`
        SELECT 
          id, 
          email, 
          name, 
          role, 
          status,
          token_balance as "tokenBalance",
          created_at as "createdAt", 
          last_login_at as "lastLoginAt"
        FROM users 
        ORDER BY last_login_at DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `

      return users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name || "Unknown",
        role: user.role,
        status: user.status,
        tokenBalance: user.tokenBalance || 0,
        createdAt: new Date(user.createdAt),
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
      }))
    } catch (error) {
      console.error("[AUTH] Error getting all users:", error)
      return []
    }
  }

  async searchUsers(query: string, limit = 20): Promise<User[]> {
    try {
      const users = await sql`
        SELECT 
          id, 
          email, 
          name, 
          role, 
          status,
          token_balance as "tokenBalance",
          created_at as "createdAt", 
          last_login_at as "lastLoginAt"
        FROM users 
        WHERE 
          name ILIKE ${`%${query}%`} OR 
          email ILIKE ${`%${query}%`}
        ORDER BY last_login_at DESC NULLS LAST
        LIMIT ${limit}
      `

      return users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name || "Unknown",
        role: user.role,
        status: user.status,
        tokenBalance: user.tokenBalance || 0,
        createdAt: new Date(user.createdAt),
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
      }))
    } catch (error) {
      console.error("[AUTH] Error searching users:", error)
      return []
    }
  }

  async updateUserStatus(userId: string, status: "active" | "inactive" | "suspended"): Promise<boolean> {
    try {
      await sql`
        UPDATE users 
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${userId}
      `
      return true
    } catch (error) {
      console.error("[AUTH] Error updating user status:", error)
      return false
    }
  }

  async updateUserRole(userId: string, role: "admin" | "user" | "moderator"): Promise<boolean> {
    try {
      await sql`
        UPDATE users 
        SET role = ${role}, updated_at = NOW()
        WHERE id = ${userId}
      `
      return true
    } catch (error) {
      console.error("[AUTH] Error updating user role:", error)
      return false
    }
  }

  async getUserStats(): Promise<{
    totalUsers: number
    activeUsers: number
    newUsersToday: number
    suspendedUsers: number
  }> {
    try {
      const [totalResult, activeResult, newTodayResult, suspendedResult] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM users`,
        sql`SELECT COUNT(*) as count FROM users WHERE status = 'active'`,
        sql`SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURRENT_DATE`,
        sql`SELECT COUNT(*) as count FROM users WHERE status = 'suspended'`,
      ])

      return {
        totalUsers: Number(totalResult[0]?.count || 0),
        activeUsers: Number(activeResult[0]?.count || 0),
        newUsersToday: Number(newTodayResult[0]?.count || 0),
        suspendedUsers: Number(suspendedResult[0]?.count || 0),
      }
    } catch (error) {
      console.error("[AUTH] Error getting user stats:", error)
      return { totalUsers: 0, activeUsers: 0, newUsersToday: 0, suspendedUsers: 0 }
    }
  }

  clearOTP(email: string): void {
    this.otpStore.delete(email.toLowerCase())
  }

  // For development/testing
  getStoredOTP(email: string): string | null {
    const entry = this.otpStore.get(email.toLowerCase())
    return entry?.otp || null
  }
}

export const authSystem = new AuthSystem()
