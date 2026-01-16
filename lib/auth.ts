/**
 * Neon Auth Client
 * 
 * Neon handles:
 * - Authentication (email/password, OAuth, magic links)
 * - OTP verification
 * - Email service
 * - Rate limiting
 * - RLS (Row Level Security)
 * - Token management
 * - Database session management
 */

import { createAuthClient } from '@neondatabase/neon-js/auth';
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters';

const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;

if (!authUrl) {
  throw new Error(
    'NEXT_PUBLIC_NEON_AUTH_URL is required. Get this from your Neon Console after enabling Neon Auth.'
  );
}

export const authClient = createAuthClient(authUrl, {
  adapter: BetterAuthReactAdapter(),
});
