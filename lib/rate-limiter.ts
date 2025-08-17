import { neon } from "@neondatabase/serverless"

let sql: ReturnType<typeof neon> | null = null

function getSql() {
  if (!sql) {
    sql = neon(process.env.NEON_DATABASE_URL!)
  }
  return sql
}

export interface CounterResult {
  count: number
  lastIncrement: Date
}

export class SimpleCounter {
  async incrementCounter(identifier: string, category: string = 'general'): Promise<CounterResult> {
    try {
      const db = getSql()
      
      // Create counters table if it doesn't exist
      await db`
        CREATE TABLE IF NOT EXISTS counters (
          id SERIAL PRIMARY KEY,
          identifier VARCHAR(255) NOT NULL,
          category VARCHAR(100) DEFAULT 'general',
          count INTEGER DEFAULT 0,
          last_increment TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(identifier, category)
        )
      `

      // Increment or create counter
      const result = await db`
        INSERT INTO counters (identifier, category, count, last_increment)
        VALUES (${identifier}, ${category}, 1, CURRENT_TIMESTAMP)
        ON CONFLICT (identifier, category)
        DO UPDATE SET 
          count = counters.count + 1,
          last_increment = CURRENT_TIMESTAMP
        RETURNING count, last_increment
      `

      const row = result[0] as any
      return {
        count: row.count,
        lastIncrement: new Date(row.last_increment)
      }
    } catch (error) {
      console.error("Counter increment failed:", error)
      // Fail gracefully - return a default count
      return {
        count: 1,
        lastIncrement: new Date()
      }
    }
  }

  async getCounter(identifier: string, category: string = 'general'): Promise<CounterResult | null> {
    try {
      const db = getSql()
      
      const result = await db`
        SELECT count, last_increment 
        FROM counters 
        WHERE identifier = ${identifier} AND category = ${category}
      `

      if (result.length === 0) {
        return null
      }

      const row = result[0] as any
      return {
        count: row.count,
        lastIncrement: new Date(row.last_increment)
      }
    } catch (error) {
      console.error("Counter retrieval failed:", error)
      return null
    }
  }

  async resetCounter(identifier: string, category: string = 'general'): Promise<boolean> {
    try {
      const db = getSql()
      
      await db`
        UPDATE counters 
        SET count = 0, last_increment = CURRENT_TIMESTAMP
        WHERE identifier = ${identifier} AND category = ${category}
      `

      return true
    } catch (error) {
      console.error("Counter reset failed:", error)
      return false
    }
  }

  async getTopCounters(category: string = 'general', limit: number = 10): Promise<Array<{identifier: string, count: number, lastIncrement: Date}>> {
    try {
      const db = getSql()
      
      const result = await db`
        SELECT identifier, count, last_increment
        FROM counters 
        WHERE category = ${category}
        ORDER BY count DESC
        LIMIT ${limit}
      `

      return result.map((row: any) => ({
        identifier: row.identifier,
        count: row.count,
        lastIncrement: new Date(row.last_increment)
      }))
    } catch (error) {
      console.error("Top counters retrieval failed:", error)
      return []
    }
  }

  // Common counter categories
  static readonly CATEGORIES = {
    API_CALLS: 'api_calls',
    USER_ACTIONS: 'user_actions', 
    CHAT_MESSAGES: 'chat_messages',
    ADMIN_ACTIONS: 'admin_actions',
    LOGINS: 'logins',
    GENERAL: 'general'
  }
}

export const simpleCounter = new SimpleCounter()
