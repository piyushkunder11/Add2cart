'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useEffect } from 'react'

interface AdminState {
  isAdmin: boolean
  setAdmin: (b: boolean) => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      isAdmin: false,
      setAdmin: (b: boolean) => set({ isAdmin: b }),
    }),
    {
      name: 'admin-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// Hook to check URL query param ?admin=1
export function useAdminModeFromQuery() {
  const setAdmin = useAdminStore((state) => state.setAdmin)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('admin') === '1') {
        setAdmin(true)
        // Remove query param from URL without reload
        const url = new URL(window.location.href)
        url.searchParams.delete('admin')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [setAdmin])
}

