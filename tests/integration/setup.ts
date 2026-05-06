import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

loadEnv({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    '[integration] Missing required env vars. Need NEXT_PUBLIC_SUPABASE_URL, ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local',
  );
}

export const adminClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function makeUserClient(email: string, password: string): Promise<SupabaseClient> {
  const c = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signInWithPassword(${email}) failed: ${error.message}`);
  return c;
}

/**
 * Mutable pointer to the Supabase client that the mocked route-handler
 * `createClient` should return. Tests flip this between brand and athlete
 * clients to simulate the cookie-bound identity that route handlers see.
 */
export const ctx: { client: SupabaseClient } = { client: adminClient };
