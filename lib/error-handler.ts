import { type NextRequest, NextResponse } from "next/server"
import { pipelineLogger } from "./pipeline-logger"

export interface ApiError extends Error {
  statusCode?: number
  code?: string
  details?: any
}

export class ValidationError extends Error {
  statusCode = 400
  code = "VALIDATION_ERROR"

  constructor(
    message: string,
    public field?: string,
  ) {
    super(message)
    this.name = "ValidationError"
  }
}

export class AuthenticationError extends Error {
  statusCode = 401
  code = "AUTHENTICATION_ERROR"

  constructor(message = "Authentication required") {
    super(message)
    this.name = "AuthenticationError"
  }
}

export class AuthorizationError extends Error {
  statusCode = 403
  code = "AUTHORIZATION_ERROR"

  constructor(message = "Insufficient permissions") {
    super(message)
    this.name = "AuthorizationError"
  }
}

export class RateLimitError extends Error {
  statusCode = 429
  code = "RATE_LIMIT_ERROR"

  constructor(message = "Rate limit exceeded") {
    super(message)
    this.name = "RateLimitError"
  }
}

export class SystemError extends Error {
  statusCode = 500
  code = "SYSTEM_ERROR"

  constructor(
    message: string,
    public originalError?: Error,
  ) {
    super(message)
    this.name = "SystemError"
  }
}

export function createErrorResponse(error: ApiError | Error, requestId?: string): NextResponse {
  const statusCode = (error as ApiError).statusCode || 500
  const code = (error as ApiError).code || "UNKNOWN_ERROR"

  const errorResponse = {
    success: false,
    error: {
      code,
      message: error.message,
      requestId,
      timestamp: new Date().toISOString(),
    },
    ...(process.env.NODE_ENV === "development" && {
      stack: error.stack,
      details: (error as ApiError).details,
    }),
  }

  // Log error
  console.error(`[API_ERROR] ${code}:`, {
    message: error.message,
    statusCode,
    requestId,
    stack: error.stack,
  })

  return NextResponse.json(errorResponse, { status: statusCode })
}

export function withErrorHandler(handler: (req: NextRequest, context?: any) => Promise<NextResponse>) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      // Add request ID to headers for tracking
      const response = await handler(req, context)
      response.headers.set("X-Request-ID", requestId)
      return response
    } catch (error) {
      await pipelineLogger.logError(requestId, "ORCHESTRATION", `API request failed: ${error}`, false)

      return createErrorResponse(error as ApiError, requestId)
    }
  }
}

export async function validateRequest(req: NextRequest, schema: any): Promise<any> {
  try {
    const body = await req.json()
    return schema.parse(body)
  } catch (error) {
    throw new ValidationError("Invalid request data", error.message)
  }
}
