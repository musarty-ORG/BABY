/**
 * Auth System - Stub Implementation
 * 
 * TODO: Remove - Neon Auth handles all authentication
 * Neon Auth provides user management, sessions, and authentication out of the box.
 */

export const authSystem = {
  async getUser(userId: string) {
    console.warn("authSystem.getUser: Use Neon Auth instead")
    return null
  },
  
  async listUsers() {
    console.warn("authSystem.listUsers: Use Neon Auth instead")
    return []
  },
  
  async createUser(data: any) {
    console.warn("authSystem.createUser: Use Neon Auth instead")
    throw new Error("Use Neon Auth for user creation")
  },
  
  async updateUser(userId: string, data: any) {
    console.warn("authSystem.updateUser: Use Neon Auth instead")
    throw new Error("Use Neon Auth for user updates")
  },
  
  async deleteUser(userId: string) {
    console.warn("authSystem.deleteUser: Use Neon Auth instead")
    throw new Error("Use Neon Auth for user deletion")
  }
}
