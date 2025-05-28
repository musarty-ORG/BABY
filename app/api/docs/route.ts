import { NextResponse } from "next/server"

export const GET = async () => {
  const apiDocs = {
    title: "Code Homie API Documentation",
    version: "1.0.0",
    description: "AI-powered development companion API",
    baseUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000",
    authentication: {
      methods: ["Session Token", "API Key"],
      headers: {
        session: "Authorization: Bearer <session_token>",
        apiKey: "X-API-Key: <api_key>",
      },
    },
    rateLimiting: {
      general: "100 requests per hour",
      chat: "30 messages per minute",
      otp: "5 requests per 5 minutes",
      admin: "50 actions per hour",
    },
    endpoints: {
      authentication: {
        "/api/auth/send-otp": {
          method: "POST",
          description: "Send OTP to email",
          body: { email: "string" },
          rateLimit: "5 per 5 minutes",
        },
        "/api/auth/verify-otp": {
          method: "POST",
          description: "Verify OTP and get session",
          body: { email: "string", otp: "string" },
          rateLimit: "10 per 15 minutes",
        },
        "/api/auth/logout": {
          method: "POST",
          description: "Logout and invalidate session",
          auth: "required",
        },
      },
      chat: {
        "/api/chat": {
          method: "POST",
          description: "Chat with AI assistant",
          body: {
            messages: "array",
            model: "string (optional)",
          },
          auth: "required",
          rateLimit: "30 per minute",
        },
      },
      multiModal: {
        "/api/multi-modal/image-to-code": {
          method: "POST",
          description: "Convert image to code",
          body: { imageUrl: "string", prompt: "string (optional)" },
          auth: "required",
        },
        "/api/multi-modal/voice": {
          method: "POST",
          description: "Process voice input",
          body: { audioData: "string (base64)" },
          auth: "required",
        },
      },
      search: {
        "/api/search": {
          method: "POST",
          description: "Search the web for development resources",
          body: {
            query: "string",
            maxResults: "number (optional)",
            searchDepth: "string (optional)",
          },
          auth: "required",
        },
      },
      admin: {
        "/api/admin/users": {
          method: "GET",
          description: "Get all users",
          auth: "admin required",
        },
        "/api/admin/metrics": {
          method: "GET",
          description: "Get system metrics",
          auth: "admin required",
        },
        "/api/admin/activities": {
          method: "GET",
          description: "Get system activities",
          auth: "admin required",
        },
      },
      health: {
        "/api/health": {
          method: "GET",
          description: "Basic health check",
          auth: "none",
        },
        "/api/health/detailed": {
          method: "GET",
          description: "Detailed health check",
          auth: "none",
        },
      },
      testing: {
        "/api/test/email": {
          method: "POST",
          description: "Test email service",
          body: { email: "string", type: "string" },
          auth: "admin required",
        },
        "/api/test/rate-limit": {
          method: "GET",
          description: "Test rate limiting",
          auth: "admin required",
        },
      },
    },
    errorCodes: {
      400: "Bad Request - Invalid input data",
      401: "Unauthorized - Authentication required",
      403: "Forbidden - Insufficient permissions",
      429: "Too Many Requests - Rate limit exceeded",
      500: "Internal Server Error - System error",
    },
    examples: {
      sendOtp: {
        request: {
          method: "POST",
          url: "/api/auth/send-otp",
          body: { email: "user@example.com" },
        },
        response: {
          success: true,
          message: "OTP sent successfully",
          rateLimitRemaining: 4,
        },
      },
      chat: {
        request: {
          method: "POST",
          url: "/api/chat",
          headers: { Authorization: "Bearer <session_token>" },
          body: {
            messages: [{ role: "user", content: "Help me create a React component" }],
          },
        },
        response: "Streaming response with AI-generated content",
      },
    },
  }

  return NextResponse.json(apiDocs, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
