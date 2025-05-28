import { z } from "zod"

// Auth schemas
export const otpRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export const otpVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
})

// Chat schemas
export const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().min(1, "Message content cannot be empty"),
    }),
  ),
  model: z.string().optional().default("llama-3.1-70b-versatile"),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().min(1).max(4000).optional().default(2000),
})

// Multi-modal schemas
export const imageAnalysisSchema = z.object({
  imageUrl: z.string().url("Invalid image URL"),
  prompt: z.string().optional(),
  analysisType: z.enum(["code", "ui", "general"]).optional().default("general"),
})

export const voiceRequestSchema = z.object({
  audioData: z.string(), // Base64 encoded audio
  format: z.enum(["wav", "mp3", "webm"]).optional().default("wav"),
})

// Search schemas
export const searchRequestSchema = z.object({
  query: z.string().min(1, "Search query cannot be empty"),
  maxResults: z.number().min(1).max(20).optional().default(10),
  searchDepth: z.enum(["basic", "advanced"]).optional().default("basic"),
  includeDomains: z.array(z.string()).optional(),
  excludeDomains: z.array(z.string()).optional(),
})

// Crawl schemas
export const crawlRequestSchema = z.object({
  url: z.string().url("Invalid URL"),
  depth: z.number().min(1).max(5).optional().default(1),
  maxPages: z.number().min(1).max(100).optional().default(10),
  includePatterns: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional(),
})

// Admin schemas
export const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["user", "moderator", "admin"]).optional(),
  status: z.enum(["active", "suspended", "banned"]).optional(),
})

export const adminActionSchema = z.object({
  action: z.enum(["suspend_user", "ban_user", "delete_user", "promote_user", "demote_user"]),
  userId: z.string().min(1),
  reason: z.string().optional(),
})

// Deployment schemas
export const deploymentRequestSchema = z.object({
  code: z.string().min(1, "Code cannot be empty"),
  framework: z.enum(["nextjs", "react", "vue", "svelte"]).optional().default("nextjs"),
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  envVars: z.record(z.string()).optional(),
})

// Analytics schemas
export const analyticsEventSchema = z.object({
  type: z.string().min(1),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  endpoint: z.string().optional(),
  method: z.string().optional(),
  statusCode: z.number().optional(),
  duration: z.number().optional(),
  metadata: z.record(z.any()).optional(),
})

// Rate limiting schemas
export const rateLimitConfigSchema = z.object({
  identifier: z.string().min(1),
  limit: z.number().min(1),
  window: z.number().min(1),
})

// Email schemas
export const emailConfigSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
})

// Health check schemas
export const healthCheckSchema = z.object({
  service: z.string().optional(),
  detailed: z.boolean().optional().default(false),
})

// Multi-agent pipeline schemas
export const multiAgentRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty").max(5000, "Prompt too long"),
  agentMode: z.enum(["code-gen", "review", "full-pipeline", "analysis"]).optional().default("code-gen"),
  codeToReview: z.string().optional(),
  maxRetries: z.number().min(1).max(5).optional().default(3),
  fileUrl: z.string().url().optional(),
  mode: z.string().optional(),
  stylePreferences: z
    .object({
      framework: z.enum(["react", "vue", "angular", "svelte", "nextjs"]).optional(),
      styling: z.enum(["tailwind", "css", "styled-components", "emotion"]).optional(),
      theme: z.enum(["light", "dark", "auto"]).optional(),
      colorScheme: z.string().optional(),
    })
    .optional(),
  context: z
    .object({
      projectType: z.string().optional(),
      requirements: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
    })
    .optional(),
})
