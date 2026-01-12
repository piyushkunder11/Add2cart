'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store/auth'
import { supabase } from '@/lib/supabase/client'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const checkSession = useAuthStore((state) => state.checkSession)

  useEffect(() => {
    // Check session on mount
    checkSession()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      useAuthStore.getState().setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [checkSession])

  return <>{children}</>
}

