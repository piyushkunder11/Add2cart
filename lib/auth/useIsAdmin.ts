'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

type AdminState = {
  isAdmin: boolean
  isLoading: boolean
  userId: string | null
  reason?: string
}

type AdminCache = {
  userId: string | null
  isAdmin: boolean
  loaded: boolean
}

const adminCache: AdminCache = {
  userId: null,
  isAdmin: false,
  loaded: false,
}

const isDev = process.env.NODE_ENV !== 'production'

function logAdmin(message: string, payload?: Record<string, unknown>) {
  if (isDev) {
    console.log('[useIsAdmin]', message, payload || '')
  }
}

export function useIsAdmin(): AdminState {
  const [state, setState] = useState<AdminState>({
    isAdmin: false,
    isLoading: true,
    userId: null,
  })
  const loadingRef = useRef(false)

  useEffect(() => {
    let active = true

    const load = async () => {
      if (loadingRef.current) return
      loadingRef.current = true

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const userId = session?.user?.id ?? null

        if (!userId) {
          if (!active) return
          adminCache.userId = null
          adminCache.isAdmin = false
          adminCache.loaded = true
          setState({ isAdmin: false, isLoading: false, userId: null, reason: 'no-user' })
          logAdmin('No user session, hiding admin UI', { userId: null, isAdmin: false })
          return
        }

        // Return cached value for this session
        if (adminCache.loaded && adminCache.userId === userId) {
          if (!active) return
          setState({ isAdmin: adminCache.isAdmin, isLoading: false, userId, reason: 'cache' })
          logAdmin('Using cached admin value', { userId, isAdmin: adminCache.isAdmin })
          return
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single()

        const isAdmin = data?.role === 'admin'
        adminCache.userId = userId
        adminCache.isAdmin = isAdmin
        adminCache.loaded = true

        if (!active) return
        setState({
          isAdmin,
          isLoading: false,
          userId,
          reason: error ? 'error' : 'db',
        })

        logAdmin('Loaded admin flag from user_roles', {
          userId,
          isAdmin,
          error: error?.message,
        })
      } catch (err) {
        if (!active) return
        adminCache.userId = null
        adminCache.isAdmin = false
        adminCache.loaded = false
        setState({ isAdmin: false, isLoading: false, userId: null, reason: 'exception' })
        logAdmin('Failed to load admin flag', { error: (err as Error).message })
      } finally {
        loadingRef.current = false
      }
    }

    load()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null
      const cacheMismatch = adminCache.userId && adminCache.userId !== nextUserId
      if (cacheMismatch) {
        adminCache.userId = null
        adminCache.isAdmin = false
        adminCache.loaded = false
      }
      load()
    })

    return () => {
      active = false
      listener?.subscription.unsubscribe()
    }
  }, [])

  return state
}

