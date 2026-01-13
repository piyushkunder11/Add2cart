import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// During build/prerender on platforms like Vercel, env vars might not be set for preview builds.
// Instead of throwing and breaking the entire build, log a warning and create a dummy client.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase client] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Supabase calls will fail at runtime until these environment variables are configured.'
  )
}

export const supabase = createClient(supabaseUrl || 'http://localhost:54321', supabaseAnonKey || 'public-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

