import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// IMPORTANT:
// - We do NOT throw during import, so Vercel build/prerender won't fail if env vars are missing.
// - Instead we log a clear warning and create a dummy client.
// - At runtime, actual data-fetching code should surface meaningful errors if Supabase is misconfigured.
if (!supabaseUrl || !supabaseAnonKey) {
  // This will appear in both local dev and server logs on Vercel
  console.warn(
    '[supabase client] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. ' +
      'Supabase calls will fail until these environment variables are configured in Vercel.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

