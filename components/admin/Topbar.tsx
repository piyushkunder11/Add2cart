'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAdminAuth } from '@/lib/demo/auth'
import { motion, AnimatePresence } from 'framer-motion'

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter()
  const { logout, email } = useAdminAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/admin/login')
  }

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 bg-[#E0E0E0]/95 backdrop-blur border-b border-neutral-300 transition-[background-color,box-shadow] duration-200"
      style={{ margin: 0, padding: 0 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ height: '64px' }}>
        <div className="flex items-center gap-3 sm:gap-4" style={{ height: '100%', alignItems: 'center' }}>
          {/* Left: brand/breadcrumb */}
          <div className="flex items-center gap-2 flex-shrink-0" style={{ alignItems: 'center' }}>
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 -ml-2 text-neutral-700 hover:bg-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              aria-label="Toggle menu"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2" style={{ alignItems: 'center' }}>
              <div className="relative h-8 w-8 md:h-9 md:w-9 flex-shrink-0">
                <Image
                  src="/LOGO/add2cart-high-resolution-logo-transparent.png"
                  alt="Add2Cart"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span 
                className="text-lg md:text-xl font-semibold leading-none text-neutral-900 whitespace-nowrap"
                style={{ lineHeight: '1', display: 'flex', alignItems: 'center' }}
              >
                Add2Cart Admin
              </span>
            </div>
          </div>

          {/* Center: search */}
          <form className="flex-1 flex items-center min-w-0" onSubmit={(e) => e.preventDefault()} style={{ alignItems: 'center' }}>
            <label className="relative block w-full">
              <input
                type="search"
                placeholder="Search orders, products..."
                className="h-10 md:h-11 w-full rounded-xl border border-neutral-300 bg-white/80 px-4 pr-10 text-sm text-neutral-900 shadow-sm outline-none transition focus:ring-4 focus:ring-black/20"
                style={{ height: '40px' }}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center">
                <svg
                  className="h-5 w-5 text-neutral-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  width={20}
                  height={20}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
            </label>
          </form>

          {/* Right: user menu */}
          <div className="relative flex items-center flex-shrink-0" ref={menuRef} style={{ alignItems: 'center' }}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="inline-flex items-center gap-2 sm:gap-3 rounded-full bg-white/80 px-3 pr-3 sm:pr-4 text-sm text-neutral-900 border border-neutral-300 shadow-sm transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-black/20"
              aria-label="Account menu"
              style={{ height: '40px', alignItems: 'center', display: 'inline-flex' }}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-neutral-900 text-white text-xs font-semibold leading-none flex-shrink-0">
                {email?.charAt(0).toUpperCase() || 'A'}
              </span>
              <span className="hidden sm:inline-block leading-none truncate max-w-[40vw]">
                {email || 'Admin'}
              </span>
              <svg
                className="h-4 w-4 text-neutral-600 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                width={16}
                height={16}
              >
                <path d="M5.5 7.5L10 12l4.5-4.5" />
              </svg>
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50"
                >
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:bg-neutral-100 transition-colors"
                  >
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
