'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/lib/store/auth'
import { useCartStore } from '@/lib/store/cart'
import { useIsAdmin } from '@/lib/auth/useIsAdmin'
import { smoothScrollTo } from '@/lib/scroll'

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('home')
  const [prevCartCount, setPrevCartCount] = useState(0)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const cartCount = useCartStore((state) => state.getTotalItems())
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin()

  const navLinks = [
    { href: '#home', label: 'Home', id: 'home' },
    { href: '#best-seller', label: 'Best Seller', id: 'best-seller' },
    { href: '#mens', label: 'Mens', id: 'mens' },
    { href: '#womens', label: 'Womens', id: 'womens' },
    { href: '#thrift', label: 'Thrift', id: 'thrift' },
    { href: '#accessories', label: 'Accessories', id: 'accessories' },
    { href: '#about', label: 'About', id: 'about' },
    { href: '#contact', label: 'Contact', id: 'contact' },
  ]

  // Scrollspy with IntersectionObserver
  useEffect(() => {
    const sectionIds = navLinks.map((link) => link.id)
    const observerOptions = {
      rootMargin: '-100px 0px -50% 0px',
      threshold: 0.1,
    }

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id')
          if (id && sectionIds.includes(id)) {
            setActiveSection(id)
          }
        }
      })
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)

    // Observe all sections
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    elements.forEach((element) => {
      observer.observe(element)
    })

    return () => {
      elements.forEach((element) => {
        observer.unobserve(element)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle hash on load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '')
      if (navLinks.some((link) => link.id === hash)) {
        setTimeout(() => {
          smoothScrollTo(hash, 80)
          setActiveSection(hash)
        }, 100)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, id: string) => {
    e.preventDefault()
    smoothScrollTo(id, 80)
    setIsMobileMenuOpen(false)
    // Update URL hash without scrolling
    window.history.pushState(null, '', href)
    setActiveSection(id)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    setIsAccountMenuOpen(false)
    setIsMobileMenuOpen(false)
  }

  // Animate cart badge when count changes
  useEffect(() => {
    if (cartCount > prevCartCount) {
      setPrevCartCount(cartCount)
    }
  }, [cartCount, prevCartCount])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-base/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <nav className="container mx-auto px-4 py-4" aria-label="Main navigation">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded">
            <div className="relative h-8 md:h-10 w-32 md:w-40">
              <Image
                src="/LOGO/add2cart-high-resolution-logo-transparent.png"
                alt="Add2Cart Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden lg:flex items-center gap-6 list-none relative">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id
              return (
                <li key={link.href} className="relative">
                  <Link
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href, link.id)}
                className={`text-gray-900 hover:text-neutral-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-2 py-1 ${
                  isActive ? 'text-primary font-bold' : ''
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-selected={isActive ? 'true' : undefined}
                  >
                    {link.label}
                  </Link>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      initial={false}
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                </li>
              )
            })}
          </ul>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* Cart Icon - Only show for users, not admins */}
            {!isAdmin && !isAdminLoading && (
              <Link
                href="/cart"
                className="relative p-2 text-gray-900 hover:text-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                aria-label={`Shopping cart with ${cartCount} items`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.3 }}
                    className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </Link>
            )}

            {/* Auth Buttons / Account Menu (Desktop) */}
            {!isAuthenticated ? (
              <div className="hidden lg:flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-4 py-2 text-gray-900 hover:text-neutral-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-primary text-white hover:bg-neutral-800 active:bg-neutral-900 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <div className="hidden lg:block relative" ref={accountMenuRef}>
                <button
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className="px-4 py-2 text-gray-900 hover:text-neutral-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded flex items-center gap-2"
                  aria-expanded={isAccountMenuOpen}
                  aria-label="Account menu"
                >
                  Account
                  <svg className={`w-4 h-4 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <AnimatePresence>
                  {isAccountMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-48 bg-base rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200 py-2"
                      role="menu"
                    >
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-gray-900 hover:bg-gray-50 hover:text-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                        role="menuitem"
                      >
                        Profile
                      </Link>
                      {isAuthenticated && !isAdmin && (
                        <Link
                          href="/order-history"
                          className="block px-4 py-2 text-gray-900 hover:bg-gray-50 hover:text-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                          role="menuitem"
                        >
                          Order History
                        </Link>
                      )}
                      {!isAdminLoading && isAdmin && (
                        <Link
                          href="/settings"
                          className="block px-4 py-2 text-gray-900 hover:bg-gray-50 hover:text-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                          role="menuitem"
                        >
                          Settings
                        </Link>
                      )}
                      {!isAdminLoading && isAdmin && (
                        <>
                          <div className="border-t border-gray-200 my-2" />
                          <div className="px-4 py-2 text-sm font-semibold text-gray-700">
                            Admin Mode Active
                          </div>
                        </>
                      )}
                      {isAuthenticated && (
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-gray-900 hover:bg-gray-50 hover:text-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                          role="menuitem"
                        >
                          Logout
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-900 hover:text-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden mt-4 pb-4 border-t border-gray-200"
            >
              <ul className="flex flex-col gap-4 pt-4 list-none">
                {navLinks.map((link) => {
                  const isActive = activeSection === link.id
                  return (
                    <li key={link.href} className="relative">
                      <Link
                        href={link.href}
                        onClick={(e) => handleNavClick(e, link.href, link.id)}
                        className={`block text-gray-900 hover:text-neutral-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded py-2 px-2 ${
                          isActive ? 'text-primary font-bold' : ''
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                        aria-selected={isActive ? 'true' : undefined}
                      >
                        {link.label}
                      </Link>
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicatorMobile"
                          className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r"
                          initial={false}
                          transition={{
                            type: 'spring',
                            stiffness: 380,
                            damping: 30,
                          }}
                        />
                      )}
                    </li>
                  )
                })}
              </ul>
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                {!isAuthenticated ? (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full px-4 py-2 text-center text-gray-900 hover:text-neutral-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                    >
                      Login
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full px-4 py-2 text-center bg-primary text-white hover:bg-neutral-800 active:bg-neutral-900 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      Sign Up
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full px-4 py-2 text-center text-gray-900 hover:text-neutral-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                    >
                      Profile
                    </Link>
                    {!isAdminLoading && isAdmin && (
                      <Link
                        href="/settings"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block w-full px-4 py-2 text-center text-gray-900 hover:text-neutral-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                      >
                        Settings
                      </Link>
                    )}
                    {!isAdminLoading && isAdmin && (
                      <div className="border-t border-gray-200 my-2" />
                    )}
                    {isAuthenticated && (
                      <button
                        onClick={handleLogout}
                        className="block w-full px-4 py-2 text-center text-gray-900 hover:text-neutral-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                      >
                        Logout
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

    </header>
  )
}

