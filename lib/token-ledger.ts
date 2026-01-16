/**
 * Token Ledger - Stub Implementation
 * 
 * TODO: Remove - Neon Auth handles token management
 * Neon Auth provides:
 * - JWT tokens
 * - Session tokens
 * - Refresh tokens
 * - Token expiration and renewal
 */

export const tokenLedger = {
  async recordTransaction(userId: string, amount: number, type: string, description: string) {
    console.warn("tokenLedger.recordTransaction: Neon Auth handles tokens")
    throw new Error("Use Neon Auth for token management")
  },
  
  async getBalance(userId: string): Promise<number> {
    console.warn("tokenLedger.getBalance: Neon Auth handles tokens")
    return 0
  },
  
  async addTokens(userId: string, amount: number, source: string) {
    console.warn("tokenLedger.addTokens: Neon Auth handles tokens")
    throw new Error("Use Neon Auth for token management")
  },
  
  async deductTokens(userId: string, amount: number, reason: string) {
    console.warn("tokenLedger.deductTokens: Neon Auth handles tokens")
    throw new Error("Use Neon Auth for token management")
  },
  
  async getTransactionHistory(userId: string, limit?: number) {
    console.warn("tokenLedger.getTransactionHistory: Neon Auth handles tokens")
    return []
  }
}
