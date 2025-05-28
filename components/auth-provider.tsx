"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { AuthLogin } from "./auth-login"

interface User {
  id: string
  email: string
  name: string
  role: string
  isNewUser?: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: () => {},
  logout: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for token in localStorage on initial load
    const storedToken = localStorage.getItem("auth_token")
    if (storedToken) {
      // Validate token and get user info
      validateToken(storedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  const validateToken = async (token: string) => {
    try {
      // Call API to validate token and get user info
      const response = await fetch("/api/user/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setToken(token)
      } else {
        // Token is invalid, clear it
        localStorage.removeItem("auth_token")
      }
    } catch (error) {
      console.error("Error validating token:", error)
      localStorage.removeItem("auth_token")
    } finally {
      setIsLoading(false)
    }
  }

  const login = (newToken: string, userData: User) => {
    localStorage.setItem("auth_token", newToken)
    setToken(newToken)
    setUser(userData)
  }

  const logout = async () => {
    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }
    } catch (error) {
      console.error("Error during logout:", error)
    } finally {
      localStorage.removeItem("auth_token")
      setToken(null)
      setUser(null)
    }
  }

  // If loading, show nothing
  if (isLoading) {
    return null
  }

  // If not authenticated, show login screen
  if (!user || !token) {
    return <AuthLogin onLogin={login} />
  }

  // If authenticated, provide auth context to children
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
