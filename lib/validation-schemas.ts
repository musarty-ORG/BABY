import { z } from "zod"

export const otpRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").optional(),
  isSignup: z.boolean().optional(),
})

export const otpVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  name: z.string().min(1, "Name is required").optional(),
  isSignup: z.boolean().optional(),
})

export const chatMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(1000, "Message too long"),
  conversationId: z.string().optional(),
})

export const tokenPurchaseSchema = z.object({
  amount: z.number().min(1, "Amount must be positive"),
  paymentMethodId: z.string().min(1, "Payment method required"),
})

export const subscriptionSchema = z.object({
  planId: z.string().min(1, "Plan ID required"),
  paymentMethodId: z.string().min(1, "Payment method required"),
})

export const adminUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["user", "admin", "moderator"]),
  tokenBalance: z.number().min(0).optional(),
})

export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  eventType: z.string().optional(),
  userId: z.string().optional(),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),
})

export const deploymentRequestSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  framework: z.enum(["nextjs", "react", "vue", "svelte"]).default("nextjs"),
  template: z.string().optional(),
  envVars: z.record(z.string()).optional(),
  buildCommand: z.string().optional(),
  outputDirectory: z.string().optional(),
})

export const multiAgentRequestSchema = z.object({
  agents: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        role: z.string(),
        instructions: z.string(),
        model: z.string().default("gpt-4"),
        temperature: z.number().min(0).max(2).default(0.7),
      }),
    )
    .min(1, "At least one agent is required"),
  task: z.string().min(1, "Task description is required"),
  maxIterations: z.number().min(1).max(10).default(5),
  collaborationMode: z.enum(["sequential", "parallel", "debate"]).default("sequential"),
})
