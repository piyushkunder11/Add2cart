'use client'

import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  checkSession: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  setUser: (user: User | null) =>
    set({
      user,
      isAuthenticated: !!user,
    }),
  checkSession: async () => {
    try {
      set({ isLoading: true })
      const { data: { session } } = await supabase.auth.getSession()
      set({
        user: session?.user ?? null,
        isAuthenticated: !!session?.user,
        isLoading: false,
      })
    } catch (error) {
      console.error('Error checking session:', error)
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },
  logout: async () => {
    try {
      await supabase.auth.signOut()
      set({
        user: null,
        isAuthenticated: false,
      })
    } catch (error) {
      console.error('Error logging out:', error)
    }
  },
}))

