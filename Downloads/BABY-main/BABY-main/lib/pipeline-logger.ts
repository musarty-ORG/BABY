import type { AuditLog, PipelineError, PipelineResult } from '@/types/pipeline'

class PipelineLogger {
  private logs: AuditLog[] = []
  private errors: PipelineError[] = []

  async logStage(
    requestId: string,
    stage: string,
    input: any,
    output: any,
    duration: number,
    metadata?: any
  ): Promise<void> {
    const logEntry: AuditLog = {
      requestId,
      stage,
      input: this.sanitizeForLogging(input),
      output: this.sanitizeForLogging(output),
      duration,
      timestamp: new Date().toISOString(),
      metadata,
    }

    this.logs.push(logEntry)

    // In production, persist to database
    console.log(`[AUDIT] ${stage}:`, logEntry)
  }

  async logError(
    requestId: string,
    stage: 'CODE_GEN' | 'REVIEW' | 'ORCHESTRATION',
    error: string,
    recoveryAttempted = false,
    recoverySuccess?: boolean
  ): Promise<void> {
    const errorEntry: PipelineError = {
      stage,
      error,
      timestamp: new Date().toISOString(),
      recoveryAttempted,
      recoverySuccess,
    }

    this.errors.push(errorEntry)

    console.error(`[ERROR] ${stage}:`, errorEntry)
  }

  async persistPipelineResult(result: PipelineResult): Promise<void> {
    // In production, save to database
    console.log(`[PIPELINE_COMPLETE] ${result.requestId}:`, result)

    // Example: Save to file system for demo
    if (typeof window === 'undefined') {
      // Server-side only
      try {
        const fs = await import('fs/promises')
        const path = `./logs/pipeline-${result.requestId}.json`
        await fs.writeFile(path, JSON.stringify(result, null, 2))
      } catch (e) {
        console.warn('Could not persist to file:', e)
      }
    }
  }

  getLogsForRequest(requestId: string): AuditLog[] {
    return this.logs.filter((log) => log.requestId === requestId)
  }

  getErrorsForRequest(requestId: string): PipelineError[] {
    return this.errors.filter((error) => error.requestId === requestId)
  }

  private sanitizeForLogging(data: any): any {
    // Remove sensitive data, truncate large objects
    if (typeof data === 'string' && data.length > 1000) {
      return data.substring(0, 1000) + '... [TRUNCATED]'
    }
    return data
  }
}

export const pipelineLogger = new PipelineLogger()
