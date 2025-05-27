// Message Contracts - Exact shape of objects passed between modules
export interface PipelineRequest {
  requestId: string
  prompt: string
  agentMode: "code-gen" | "review" | "full-pipeline"
  codeToReview?: string
  maxRetries?: number
  timestamp: string
}

export interface RawCode {
  requestId: string
  prompt: string
  code: string
  metadata?: {
    model: string
    generationTime: number
    tokenCount?: number
  }
  timestamp: string
}

export interface ReviewedCode {
  requestId: string
  prompt: string
  code: string
  reviewNotes: string[]
  qualityScore: number
  securityIssues: string[]
  performanceIssues: string[]
  verdict: "APPROVE" | "REJECT" | "NEEDS_REVISION"
  suggestedFixes?: string[]
  metadata?: {
    reviewer: string
    reviewTime: number
  }
  timestamp: string
}

export interface PipelineResult {
  requestId: string
  originalPrompt: string
  finalCode: string
  iterations: PipelineIteration[]
  status: "SUCCESS" | "FAILED" | "PARTIAL"
  totalTime: number
  timestamp: string
  errorLog?: PipelineError[]
}

export interface PipelineIteration {
  iterationNumber: number
  rawCode: RawCode
  review: ReviewedCode
  action: "APPROVED" | "RETRY" | "FAILED"
  timestamp: string
}

export interface PipelineError {
  stage: "CODE_GEN" | "REVIEW" | "ORCHESTRATION"
  error: string
  timestamp: string
  recoveryAttempted: boolean
  recoverySuccess?: boolean
}

export interface AuditLog {
  requestId: string
  stage: string
  input: any
  output: any
  duration: number
  timestamp: string
  metadata?: any
}
