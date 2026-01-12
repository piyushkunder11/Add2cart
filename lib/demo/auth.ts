'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AdminAuthState {
  isAdmin: boolean
  email: string | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const DEMO_CREDS = {
  email: 'admin@demo.com',
  password: 'Demo@123',
}

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set) => ({
      isAdmin: false,
      email: null,
      login: async (email: string, password: string) => {
        // Demo auth - no backend
        if (email.toLowerCase() === DEMO_CREDS.email && password === DEMO_CREDS.password) {
          set({ isAdmin: true, email })
          return { success: true }
        }
        return { success: false, error: 'Invalid credentials' }
      },
      logout: () => {
        set({ isAdmin: false, email: null })
      },
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : ({
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            } as unknown as Storage)
      ),
    }
  )
)

