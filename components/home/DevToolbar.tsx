'use client'

import { useAuthStore } from '@/lib/store/auth'
import { useIsAdmin } from '@/lib/auth/useIsAdmin'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getRealtimeStatus } from '@/lib/supabase/products'

export default function DevToolbar() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin()
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState(getRealtimeStatus())
  const [supabaseUrl, setSupabaseUrl] = useState<string>('')

  useEffect(() => {
    // Get masked Supabase URL
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    if (url) {
      try {
        const urlObj = new URL(url)
        setSupabaseUrl(`${urlObj.hostname.replace(/\./g, '•')}`)
      } catch {
        setSupabaseUrl('Not configured')
      }
    }

    // Update realtime status periodically
    const interval = setInterval(() => {
      setRealtimeStatus(getRealtimeStatus())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white rounded-lg shadow-xl overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 text-xs font-semibold bg-gray-800 hover:bg-gray-700 transition-colors flex items-center justify-between"
      >
        <span>Debug Panel</span>
        <span className="text-xs">{isExpanded ? '▼' : '▲'}</span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-4 space-y-3 text-xs"
          >
            <div>
              <div className="text-gray-400 mb-1">Project URL</div>
              <div className="font-mono text-[10px] break-all">{supabaseUrl || 'Loading...'}</div>
            </div>

            <div>
              <div className="text-gray-400 mb-1">Auth User ID</div>
              <div className="font-mono text-[10px] break-all">
                {user?.id || 'Not authenticated'}
              </div>
            </div>

            <div>
              <div className="text-gray-400 mb-1">isAdmin</div>
              <div className={`font-semibold ${isAdmin ? 'text-green-400' : 'text-red-400'}`}>
                {isAdminLoading ? 'loading' : isAdmin ? 'true' : 'false'}
              </div>
            </div>

            <div>
              <div className="text-gray-400 mb-1">Realtime</div>
              <div className={`font-semibold ${realtimeStatus.connected ? 'text-green-400' : 'text-red-400'}`}>
                {realtimeStatus.connected ? 'Connected' : 'Disconnected'}
              </div>
              {realtimeStatus.connected && (
                <div className="text-[10px] text-gray-500 mt-1">
                  Subscribers: {realtimeStatus.subscribers}
                </div>
              )}
            </div>

            {realtimeStatus.lastEvent && (
              <div>
                <div className="text-gray-400 mb-1">Last Event</div>
                <div className="text-[10px] font-mono">
                  {realtimeStatus.lastEvent.type} on {realtimeStatus.lastEvent.table}
                </div>
                <div className="text-[10px] text-gray-500">
                  {new Date(realtimeStatus.lastEvent.timestamp).toLocaleTimeString()}
                </div>
              </div>
            )}

            <div>
              <div className="text-gray-400 mb-1">Auth Status</div>
              <div
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  isAuthenticated ? 'bg-green-600' : 'bg-gray-700'
                }`}
              >
                {isAuthenticated ? '✓ Authenticated' : '✗ Not Authenticated'}
              </div>
            </div>

            {user && (
              <div>
                <div className="text-gray-400 mb-1">Email</div>
                <div className="text-[10px] break-all">{user.email}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

