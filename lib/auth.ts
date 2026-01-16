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
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_NEON_AUTH_URL is required in production. Get this from your Neon Console after enabling Neon Auth.'
    );
  }
  console.warn(
    '⚠️  NEXT_PUBLIC_NEON_AUTH_URL is not set. Neon Auth features will not work.\n' +
    '   Get your Auth URL from the Neon Console after enabling Neon Auth.\n' +
    '   Format: https://ep-xxx.neonauth.c-2.us-east-2.aws.neon.build/dbname/auth'
  );
}

export const authClient = authUrl ? createAuthClient(authUrl, {
  adapter: BetterAuthReactAdapter(),
}) : null;
