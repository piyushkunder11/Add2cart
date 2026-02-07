import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

/**
 * Server-side Supabase client with service role key only.
 * Use for operations that must persist regardless of RLS (e.g. category image update).
 * Returns null if SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export function createServiceRoleClient(): ReturnType<typeof createClient> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Server-side Supabase client
 * Use this in API routes and server components
 */
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
  }

  // Prefer service role key (bypasses RLS), fallback to anon key
  const keyToUse = supabaseServiceKey || supabaseAnonKey

  if (!keyToUse) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  // Warn in development if service role key is not set (for better debugging)
  if (process.env.NODE_ENV !== 'production' && !supabaseServiceKey) {
    console.warn('[Supabase] ⚠️  Using anon key instead of service role key. Some operations may fail due to RLS policies.')
    console.warn('[Supabase] Set SUPABASE_SERVICE_ROLE_KEY in .env.local to bypass RLS for server-side operations.')
  }

  // Use service role key if available (for admin operations), otherwise use anon key
  return createClient(supabaseUrl, keyToUse, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Server-side Supabase client with authentication support
 * Creates a client with anon key and extracts access token from request headers
 * Use this when you need to authenticate users in API routes
 */
export function createServerSupabaseClientWithAuth(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  // Extract access token from Authorization header
  const authHeader = request.headers.get('Authorization')
  const accessToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null

  // Create client with anon key (for user authentication, respects RLS)
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`,
      } : {},
    },
  })

  return {
    client,
    accessToken,
  }
}
