"use client"

import { useState, useEffect, useCallback } from "react"

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface SessionState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export function useAuth() {
  const [sessionState, setSessionState] = useState<SessionState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  })

  const clearSession = useCallback(() => {
    localStorage.removeItem("session_token")
    setSessionState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    })
  }, [])

  const redirectToLogin = useCallback(() => {
    window.location.href = "/pricing"
  }, [])

  const checkSession = useCallback(async (showErrorToast = false) => {
    const sessionToken = localStorage.getItem("session_token")
    
    if (!sessionToken) {
      setSessionState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      })
      return null
    }

    try {
      const response = await fetch("/api/user/dashboard", {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      })

      if (response.status === 401) {
        // Session expired or invalid
        clearSession()
        if (showErrorToast) {
          // Show notification that session expired
          console.log("Session expired. Please log in again.")
        }
        return null
      }

      if (!response.ok) {
        throw new Error("Failed to verify session")
      }

      const data = await response.json()
      
      if (data.success) {
        const user = data.data.user
        setSessionState({
          user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        })
        return user
      } else {
        clearSession()
        return null
      }
    } catch (error) {
      setSessionState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      })
      return null
    }
  }, [clearSession])

  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const sessionToken = localStorage.getItem("session_token")
    
    if (!sessionToken) {
      redirectToLogin()
      throw new Error("Not authenticated")
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${sessionToken}`,
      },
    })

    if (response.status === 401) {
      // Session expired, clear it and redirect to login
      clearSession()
      redirectToLogin()
      throw new Error("Session expired")
    }

    return response
  }, [clearSession, redirectToLogin])

  const requireAuth = useCallback((redirectIfNot = true) => {
    if (!sessionState.isAuthenticated && !sessionState.isLoading) {
      if (redirectIfNot) {
        redirectToLogin()
      }
      return false
    }
    return sessionState.isAuthenticated
  }, [sessionState.isAuthenticated, sessionState.isLoading, redirectToLogin])

  const login = useCallback((sessionToken: string) => {
    localStorage.setItem("session_token", sessionToken)
    checkSession()
  }, [checkSession])

  const logout = useCallback(() => {
    clearSession()
    window.location.href = "/"
  }, [clearSession])

  // Check session on mount
  useEffect(() => {
    checkSession()
  }, [checkSession])

  return {
    user: sessionState.user,
    isLoading: sessionState.isLoading,
    isAuthenticated: sessionState.isAuthenticated,
    error: sessionState.error,
    checkSession,
    authenticatedFetch,
    requireAuth,
    login,
    logout,
    clearSession,
  }
}