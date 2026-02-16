'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/store/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Navbar from '@/components/home/Navbar'
import Footer from '@/components/home/Footer'

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    // Wait for auth to finish loading
    if (!authLoading) {
      setHasChecked(true)
      // Redirect to login if not authenticated
      if (!isAuthenticated) {
        router.push('/login')
      }
    }
  }, [authLoading, isAuthenticated, router])

  // Show loading while auth is being checked
  if (authLoading || !hasChecked) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated (handled in useEffect, but show nothing while redirecting)
  if (!isAuthenticated || !user) {
    return null
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return 'N/A'
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-base pt-20">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
              <p className="text-gray-600">View and manage your account information</p>
            </div>

            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-[0_10px_25px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Account Information</h2>
                <Link
                  href="/order-history"
                  className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  View Orders →
                </Link>
              </div>

              <div className="space-y-6">
                {/* Email */}
                <div className="pb-6 border-b border-gray-200">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Email Address
                  </label>
                  <p className="text-lg text-gray-900">{user.email || 'N/A'}</p>
                  {user.email_confirmed_at ? (
                    <span className="inline-flex items-center mt-2 text-sm text-green-600">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center mt-2 text-sm text-yellow-600">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Not Verified
                    </span>
                  )}
                </div>

                {/* User ID */}
                <div className="pb-6 border-b border-gray-200">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    User ID
                  </label>
                  <p className="text-sm text-gray-600 font-mono break-all">{user.id}</p>
                </div>

                {/* Account Created */}
                <div className="pb-6 border-b border-gray-200">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Account Created
                  </label>
                  <p className="text-lg text-gray-900">{formatDate(user.created_at)}</p>
                </div>

                {/* Last Sign In */}
                <div className="pb-6 border-b border-gray-200">
                  <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Last Sign In
                  </label>
                  <p className="text-lg text-gray-900">
                    {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'N/A'}
                  </p>
                </div>

                {/* Phone Number (if available) */}
                {user.phone && (
                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                      Phone Number
                    </label>
                    <p className="text-lg text-gray-900">{user.phone}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/order-history"
                  className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors text-center"
                >
                  View Order History
                </Link>
                <Link
                  href="/"
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-center"
                >
                  Back to Home
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  )
}
