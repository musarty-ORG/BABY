"use client"

import { useState, useCallback } from "react"

interface Toast {
  id: string
  type: "success" | "error" | "warning" | "info"
  message: string
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: Toast["type"], message: string, duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9)
    const toast: Toast = { id, type, message, duration }
    
    setToasts(prev => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((message: string, duration?: number) => {
    return addToast("success", message, duration)
  }, [addToast])

  const error = useCallback((message: string, duration?: number) => {
    return addToast("error", message, duration)
  }, [addToast])

  const warning = useCallback((message: string, duration?: number) => {
    return addToast("warning", message, duration)
  }, [addToast])

  const info = useCallback((message: string, duration?: number) => {
    return addToast("info", message, duration)
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  }
}