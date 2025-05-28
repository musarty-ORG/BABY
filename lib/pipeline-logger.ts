interface LogEntry {
  requestId: string
  timestamp: string
  level: "info" | "warn" | "error" | "debug"
  component: string
  message: string
  metadata?: any
}

class PipelineLogger {
  private logs: LogEntry[] = []
  private readonly MAX_LOGS = 1000

  async logInfo(requestId: string, component: string, message: string, metadata?: any): Promise<void> {
    await this.log(requestId, "info", component, message, metadata)
  }

  async logWarning(requestId: string, component: string, message: string, metadata?: any): Promise<void> {
    await this.log(requestId, "warn", component, message, metadata)
  }

  async logError(
    requestId: string,
    component: string,
    message: string,
    shouldThrow = false,
    metadata?: any,
  ): Promise<void> {
    await this.log(requestId, "error", component, message, metadata)

    if (shouldThrow) {
      throw new Error(message)
    }
  }

  async logDebug(requestId: string, component: string, message: string, metadata?: any): Promise<void> {
    if (process.env.NODE_ENV === "development") {
      await this.log(requestId, "debug", component, message, metadata)
    }
  }

  private async log(
    requestId: string,
    level: "info" | "warn" | "error" | "debug",
    component: string,
    message: string,
    metadata?: any,
  ): Promise<void> {
    const entry: LogEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      metadata,
    }

    // In production, we would send this to a logging service
    // For now, just console log and store in memory
    this.logToConsole(entry)
    this.storeLog(entry)
  }

  private logToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.component}] [${entry.requestId}]`

    switch (entry.level) {
      case "error":
        console.error(`${prefix} ${entry.message}`, entry.metadata || "")
        break
      case "warn":
        console.warn(`${prefix} ${entry.message}`, entry.metadata || "")
        break
      case "debug":
        console.debug(`${prefix} ${entry.message}`, entry.metadata || "")
        break
      default:
        console.log(`${prefix} ${entry.message}`, entry.metadata || "")
    }
  }

  private storeLog(entry: LogEntry): void {
    this.logs.push(entry)

    // Keep logs under the maximum size
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS)
    }
  }

  getRecentLogs(count = 100): LogEntry[] {
    return this.logs.slice(-count)
  }

  getLogsByRequestId(requestId: string): LogEntry[] {
    return this.logs.filter((log) => log.requestId === requestId)
  }
}

export const pipelineLogger = new PipelineLogger()
