'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/auth'
import Toast from '@/components/ui/Toast'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useAuthStore((state) => state.setUser)
  const checkSession = useAuthStore((state) => state.checkSession)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Wait a brief moment for Supabase to process hash fragments automatically
        // (Supabase client with detectSessionInUrl: true handles hash fragments)
        await new Promise(resolve => setTimeout(resolve, 100))

        // Supabase email confirmation links use hash fragments (#) instead of query params
        // Parse hash fragment if present
        const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : ''
        const hashParams = new URLSearchParams(hash)
        
        // Also check query params for compatibility
        const queryCode = searchParams.get('code')
        const queryError = searchParams.get('error')
        const queryErrorDescription = searchParams.get('error_description')
        
        // Get code from hash fragment or query params
        const code = hashParams.get('code') || queryCode
        const error = hashParams.get('error') || queryError
        const errorDescription = hashParams.get('error_description') || queryErrorDescription

        // Handle error from Supabase
        if (error) {
          setStatus('error')
          setErrorMessage(errorDescription || error || 'Authentication failed')
          setToastMessage(errorDescription || error || 'Authentication failed')
          setToastType('error')
          setShowToast(true)
          return
        }

        // If we have a code, exchange it for session
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            setStatus('error')
            setErrorMessage(exchangeError.message || 'Failed to verify email')
            setToastMessage(exchangeError.message || 'Failed to verify email')
            setToastType('error')
            setShowToast(true)
            return
          }

          if (data.session && data.user) {
            // Session created successfully - user is verified and logged in
            // Update auth store with the user
            setUser(data.user)
            
            // Refresh session to ensure everything is in sync
            await checkSession()
            
            setStatus('success')
            setToastMessage('Email verified & logged in')
            setToastType('success')
            setShowToast(true)

            // Redirect to home after a short delay
            setTimeout(() => {
              router.push('/')
              router.refresh()
            }, 2000)
            return
          } else {
            setStatus('error')
            setErrorMessage('Session creation failed')
            setToastMessage('Session creation failed. Please try again.')
            setToastType('error')
            setShowToast(true)
            return
          }
        }

        // If no code in URL, check if Supabase already handled it automatically
        // (with detectSessionInUrl: true, it might have already processed the hash)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user?.email_confirmed_at) {
          // Session already exists and email is verified
          setUser(session.user)
          await checkSession()
          
          setStatus('success')
          setToastMessage('Email verified & logged in')
          setToastType('success')
          setShowToast(true)

          setTimeout(() => {
            router.push('/')
            router.refresh()
          }, 2000)
          return
        }

        // No code found and no valid session
        setStatus('error')
        setErrorMessage('No verification code found in the URL')
        setToastMessage('No verification code found. Please try clicking the link again from your email.')
        setToastType('error')
        setShowToast(true)
      } catch (err) {
        setStatus('error')
        const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred'
        setErrorMessage(errorMsg)
        setToastMessage(errorMsg)
        setToastType('error')
        setShowToast(true)
      }
    }

    handleCallback()
  }, [searchParams, setUser, checkSession, router])

  return (
    <>
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-100 rounded-2xl shadow-xl max-w-md w-full p-8 text-center"
        >
          {status === 'loading' && (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
              />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email...</h2>
              <p className="text-gray-600">Please wait while we confirm your email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <svg
                  className="w-8 h-8 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
              <p className="text-gray-600 mb-4">You&apos;re being redirected to the home page...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
              <p className="text-gray-600 mb-6">{errorMessage}</p>
              <Link
                href="/login"
                className="inline-block bg-primary text-white hover:bg-neutral-800 font-semibold py-3 px-6 rounded-lg transition-colors duration-300 shadow-md hover:shadow-lg"
              >
                Go to Login
              </Link>
            </>
          )}
        </motion.div>
      </div>
    </>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="bg-gray-100 rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
