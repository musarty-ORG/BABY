import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.NEON_NEON_DATABASE_URL!)

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const users = await sql`
            SELECT id, email, name, password_hash, created_at, subscription_status, token_balance
            FROM users 
            WHERE email = ${credentials.email}
          `

          if (users.length === 0) {
            return null
          }

          const user = users[0]

          // In a real implementation, you'd verify the password hash
          // For now, we'll do a simple comparison (replace with proper bcrypt)
          if (credentials.password !== user.password_hash) {
            return null
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            subscriptionStatus: user.subscription_status,
            tokenBalance: user.token_balance,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.subscriptionStatus = (user as any).subscriptionStatus
        token.tokenBalance = (user as any).tokenBalance
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        ;(session.user as any).subscriptionStatus = token.subscriptionStatus
        ;(session.user as any).tokenBalance = token.tokenBalance
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}
