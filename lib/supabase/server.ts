import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client
 * Use this in API routes and server components
 */
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    // During build/prerender, avoid throwing to keep static generation working.
    // Callers should handle misconfiguration errors from Supabase operations.
    console.warn(
      '[server supabase] Missing SUPABASE env vars. ' +
        'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY for full functionality.'
    )
  }

  // Use service role key if available (for admin operations), otherwise use anon key
  return createClient(supabaseUrl || 'http://localhost:54321', supabaseServiceKey || 'public-anon-key', {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

