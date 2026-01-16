import { createAuthClient } from '@neondatabase/neon-js/auth';
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters';

const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;

if (!authUrl) {
  console.warn('NEXT_PUBLIC_NEON_AUTH_URL environment variable is not set. Neon Auth features will be disabled.');
}

export const neonAuthClient = authUrl ? createAuthClient(authUrl, {
  adapter: BetterAuthReactAdapter(),
}) : null;
