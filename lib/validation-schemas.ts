import { z } from "zod"

// Chat validation
export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(10000),
      }),
    )
    .min(1),
  model: z.enum(["scout", "maverick"]).optional(),
})

// Multi-agent validation
export const multiAgentRequestSchema = z.object({
  prompt: z.string().min(1).max(5000),
  agentMode: z.enum(["code-gen", "review", "full-pipeline"]),
  codeToReview: z.string().optional(),
  maxRetries: z.number().min(1).max(5).optional(),
  fileUrl: z.string().url().optional(),
  mode: z.string().optional(),
  stylePreferences: z
    .object({
      framework: z.string().optional(),
      styling: z.string().optional(),
      theme: z.string().optional(),
    })
    .optional(),
})

// Admin user validation
export const userUpdateSchema = z.object({
  action: z.enum(["view", "edit", "suspend", "activate", "delete"]),
  data: z
    .object({
      name: z.string().min(1).max(100).optional(),
      email: z.string().email().optional(),
      role: z.enum(["admin", "user", "moderator"]).optional(),
      status: z.enum(["active", "inactive", "suspended"]).optional(),
    })
    .optional(),
})

// Search validation
export const searchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  maxResults: z.number().min(1).max(20).optional(),
  searchDepth: z.enum(["basic", "advanced"]).optional(),
  includeDomains: z.array(z.string()).optional(),
  includeAnswer: z.boolean().optional(),
})

// Voice command validation
export const voiceCommandSchema = z.object({
  audioData: z.string(), // base64 encoded audio
  format: z.enum(["wav", "mp3", "webm"]).optional(),
})

// Image analysis validation
export const imageAnalysisSchema = z.object({
  imageData: z.string(), // base64 encoded image
  framework: z.enum(["react", "vue", "angular", "html"]).optional(),
  analysisType: z.enum(["ui", "sketch", "wireframe"]).optional(),
})

// Deployment validation
export const deploymentRequestSchema = z.object({
  codeFiles: z.record(z.string()),
  projectName: z.string().min(1).max(50),
  requestId: z.string().optional(),
  platform: z.enum(["vercel", "netlify"]).optional(),
})

// OTP validation
export const otpRequestSchema = z.object({
  email: z.string().email(),
})

export const otpVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
})
