'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/auth'
import { supabase } from '@/lib/supabase/client'
import Toast from '@/components/ui/Toast'
// Using inline SVGs instead of lucide-react for simplicity

interface AuthScreenProps {
  defaultTab?: 'login' | 'signup'
}

export default function AuthScreen({ defaultTab = 'login' }: AuthScreenProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useAuthStore((state) => state.setUser)
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(defaultTab)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [showToast, setShowToast] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [verificationToken, setVerificationToken] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [isCheckingVerification, setIsCheckingVerification] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const redirectPath = useMemo(() => {
    const param = searchParams?.get('redirect') || '/'
    // Allow only same-site relative paths
    return param.startsWith('/') ? param : '/'
  }, [searchParams])

  // Listen for auth state changes (e.g., user verifies email in another tab)
  useEffect(() => {
    if (!showVerificationModal) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        // User verified their email
        setUser(session.user)
        setShowVerificationModal(false)
        setToastMessage('Email verified! Welcome!')
        setToastType('success')
        setShowToast(true)
        setTimeout(() => {
          router.push('/')
        }, 1500)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [showVerificationModal, setUser, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setShowSuccess(false)

    try {
      if (activeTab === 'login') {
        // Login with Supabase
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })

        if (signInError) {
          setError(signInError.message)
          setToastMessage(signInError.message || 'Invalid credentials')
          setToastType('error')
          setShowToast(true)
          setIsSubmitting(false)
          return
        }

        if (data.user) {
          setUser(data.user)
          setToastMessage('Logged in')
          setToastType('success')
          setShowToast(true)
          setShowSuccess(true)
          setTimeout(() => {
            router.push(redirectPath)
          }, 800)
        }
      } else {
        // Signup with Supabase
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match')
          setToastMessage('Passwords do not match')
          setToastType('error')
          setShowToast(true)
          setIsSubmitting(false)
          return
        }

        // Determine redirect URL based on environment
        // Use NEXT_PUBLIC_SITE_URL if set, otherwise use current origin
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
        const redirectUrl = `${baseUrl}/auth/callback`

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              name: formData.name,
            },
          },
        })

        if (signUpError) {
          setError(signUpError.message)
          setToastMessage(signUpError.message || 'Signup failed')
          setToastType('error')
          setShowToast(true)
          setIsSubmitting(false)
          return
        }

        if (data.user) {
          // Don't log them in - show verification modal instead
          setSignupEmail(formData.email)
          setShowVerificationModal(true)
          setIsSubmitting(false)
          // Clear form but keep email for reference
          setFormData({ name: '', email: '', password: '', confirmPassword: '' })
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      setToastMessage(errorMessage)
      setToastType('error')
      setShowToast(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  }

  const [direction, setDirection] = useState(0)

  const switchTab = (tab: 'login' | 'signup') => {
    const newDirection = tab === 'signup' ? 1 : -1
    setDirection(newDirection)
    setActiveTab(tab)
    setShowSuccess(false)
  }

  return (
    <>
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
      <div className="min-h-screen bg-base flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 -left-20 w-96 h-96 bg-black/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-20 -right-20 w-96 h-96 bg-black/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Tab switcher */}
        <motion.div
          className="bg-gray-100 rounded-xl p-1.5 mb-8 flex gap-2"
          variants={itemVariants}
        >
          <button
            onClick={() => switchTab('login')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${
              activeTab === 'login'
                ? 'bg-base text-primary shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => switchTab('signup')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${
              activeTab === 'signup'
                ? 'bg-base text-primary shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sign Up
          </button>
        </motion.div>

        {/* Form container */}
        <div className="bg-base rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-100 p-8 relative overflow-hidden">
            {/* Success message */}
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-0 left-0 right-0 bg-green-500 text-white text-center py-3 px-4 rounded-t-2xl font-medium text-sm z-20"
                >
                  {activeTab === 'login'
                    ? 'Login successful!'
                    : 'Account created successfully! Redirecting to login...'}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error message */}
            {error && !showSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3"
              >
                {error}
              </motion.div>
            )}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.form
              key={activeTab}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
            <motion.h1
              className="text-3xl font-bold text-gray-900 mb-2"
              variants={itemVariants}
            >
              {activeTab === 'login' ? 'Welcome back' : 'Create account'}
            </motion.h1>
            <motion.p
              className="text-gray-600 mb-6"
              variants={itemVariants}
            >
              {activeTab === 'login'
                ? 'Sign in to continue to Add2Cart'
                : 'Join Add2Cart and start shopping'}
            </motion.p>

            {/* Name field (signup only) */}
            {activeTab === 'signup' && (
              <motion.div variants={itemVariants}>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Full Name
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </motion.div>
            )}

            {/* Email field */}
            <motion.div variants={itemVariants}>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </motion.div>

            {/* Password field */}
            <motion.div variants={itemVariants}>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </motion.div>

            {/* Confirm password (signup only) */}
            {activeTab === 'signup' && (
              <motion.div variants={itemVariants}>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              variants={itemVariants}
              className="w-full bg-primary text-white hover:bg-neutral-800 active:bg-neutral-900 font-semibold py-3 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  {activeTab === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : activeTab === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </motion.button>

            {/* Divider */}
            <motion.div
              className="relative my-6"
              variants={itemVariants}
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-base px-4 text-gray-500">Or continue with</span>
              </div>
            </motion.div>

            {/* Social login buttons */}
            <motion.div
              className="space-y-3"
              variants={itemVariants}
            >
              <button
                type="button"
                onClick={async () => {
                  try {
                    setIsSubmitting(true)
                    setError(null)
                    
                    // Determine redirect URL based on environment
                    const baseUrl = typeof window !== 'undefined' 
                      ? window.location.origin 
                      : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
                    const redirectUrl = `${baseUrl}/auth/callback`

                    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: redirectUrl,
                        queryParams: {
                          access_type: 'offline',
                          prompt: 'consent',
                        },
                      },
                    })

                    if (oauthError) {
                      setError(oauthError.message)
                      setToastMessage(oauthError.message || 'Google sign-in failed')
                      setToastType('error')
                      setShowToast(true)
                      setIsSubmitting(false)
                      return
                    }

                    // OAuth redirect will happen automatically
                    // The user will be redirected back to /auth/callback after authentication
                  } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Google sign-in failed'
                    setError(errorMessage)
                    setToastMessage(errorMessage)
                    setToastType('error')
                    setShowToast(true)
                    setIsSubmitting(false)
                  }
                }}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400 hover:shadow-md transition-all duration-200 font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-[15px]">Continue with Google</span>
              </button>
            </motion.div>

            {/* Footer link */}
            {activeTab === 'login' && (
              <motion.p
                className="text-center text-sm text-gray-600 mt-6"
                variants={itemVariants}
              >
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('signup')}
                  className="text-primary font-semibold hover:text-neutral-700 transition-colors"
                >
                  Sign up
                </button>
              </motion.p>
            )}
            {activeTab === 'signup' && (
              <motion.p
                className="text-center text-sm text-gray-600 mt-6"
                variants={itemVariants}
              >
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="text-primary font-semibold hover:text-neutral-700 transition-colors"
                >
                  Sign in
                </button>
              </motion.p>
            )}
          </motion.form>
        </AnimatePresence>
        </div>
      </motion.div>

      {/* Email Verification Modal */}
      <AnimatePresence>
        {showVerificationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              // Don't close on backdrop click - user needs to verify
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-gray-100 rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Verify your email</h2>
              
              {/* Description */}
              <p className="text-gray-700 mb-6 leading-relaxed">
                We sent a verification link to <span className="font-semibold">{signupEmail}</span>. Please open your inbox and verify to continue.
              </p>

              {/* Advanced section (hidden by default) */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-4 overflow-hidden"
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paste verification link token (optional)
                    </label>
                    <input
                      type="text"
                      value={verificationToken}
                      onChange={(e) => setVerificationToken(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                      placeholder="Paste token here..."
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Buttons */}
              <div className="space-y-3">
                {/* Open Gmail */}
                <button
                  type="button"
                  onClick={() => {
                    window.open('https://mail.google.com', '_blank')
                  }}
                  className="w-full bg-gray-800 text-white hover:bg-gray-900 font-semibold py-3 px-4 rounded-lg transition-colors duration-300 shadow-md hover:shadow-lg"
                >
                  Open Gmail
                </button>

                {/* Resend verification email */}
                <button
                  type="button"
                  onClick={async () => {
                    setIsResending(true)
                    try {
                      // Determine redirect URL (same as signup)
                      const baseUrl = typeof window !== 'undefined' 
                        ? window.location.origin 
                        : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
                      const redirectUrl = `${baseUrl}/auth/callback`

                      // Try resend method first
                      let resendError = null
                      const { data: resendData, error: resendErr } = await supabase.auth.resend({
                        type: 'signup',
                        email: signupEmail,
                        options: {
                          emailRedirectTo: redirectUrl,
                        },
                      })

                      if (resendErr) {
                        resendError = resendErr
                        if (process.env.NODE_ENV !== 'production') {
                          console.warn('[Resend] resend() failed, trying signUp again:', resendErr)
                        }
                        
                        // If resend fails, try signing up again (Supabase will resend if user exists)
                        // This is a fallback approach
                        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
                          email: signupEmail,
                          password: 'temp-password-placeholder', // Won't be used if user exists
                          options: {
                            emailRedirectTo: redirectUrl,
                          },
                        })

                        if (signUpErr) {
                          // Check if error is because user already exists (which is expected)
                          if (signUpErr.message?.includes('already registered') || 
                              signUpErr.message?.includes('already exists') ||
                              signUpErr.message?.includes('User already registered')) {
                            // User exists, Supabase should have resent the email
                            setToastMessage('Verification email resent! Please check your inbox.')
                            setToastType('success')
                            setShowToast(true)
                            setIsResending(false)
                            return
                          } else {
                            throw signUpErr
                          }
                        } else if (signUpData) {
                          // Success - email resent
                          setToastMessage('Verification email resent! Please check your inbox.')
                          setToastType('success')
                          setShowToast(true)
                          setIsResending(false)
                          return
                        }
                      } else {
                        // Resend succeeded
                        if (process.env.NODE_ENV !== 'production') {
                          console.log('[Resend] Success:', resendData)
                        }
                        setToastMessage('Verification email resent! Please check your inbox.')
                        setToastType('success')
                        setShowToast(true)
                        setIsResending(false)
                        return
                      }

                      // If we get here, something went wrong
                      throw resendError || new Error('Failed to resend email')
                    } catch (err) {
                      console.error('[Resend] Exception:', err)
                      const errorMsg = err instanceof Error ? err.message : 'Failed to resend email'
                      setToastMessage(errorMsg)
                      setToastType('error')
                      setShowToast(true)
                    } finally {
                      setIsResending(false)
                    }
                  }}
                  disabled={isResending}
                  className="w-full bg-gray-200 text-gray-900 hover:bg-gray-300 font-semibold py-3 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResending ? 'Sending...' : 'Resend verification email'}
                </button>

                {/* I've verified button */}
                <button
                  type="button"
                  onClick={async () => {
                    setIsCheckingVerification(true)
                    try {
                      // Check current session
                      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
                      
                      if (sessionError) {
                        setToastMessage('Error checking verification status')
                        setToastType('error')
                        setShowToast(true)
                        setIsCheckingVerification(false)
                        return
                      }

                      if (session?.user?.email_confirmed_at) {
                        // Email is verified - log them in
                        setUser(session.user)
                        setShowVerificationModal(false)
                        setToastMessage('Email verified! Welcome!')
                        setToastType('success')
                        setShowToast(true)
                        setTimeout(() => {
                          router.push('/')
                        }, 1500)
                      } else {
                        setToastMessage('Email not verified yet. Please check your inbox.')
                        setToastType('error')
                        setShowToast(true)
                      }
                    } catch (err) {
                      setToastMessage('Error checking verification status')
                      setToastType('error')
                      setShowToast(true)
                    } finally {
                      setIsCheckingVerification(false)
                    }
                  }}
                  disabled={isCheckingVerification}
                  className="w-full bg-primary text-white hover:bg-neutral-800 font-semibold py-3 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  {isCheckingVerification ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      Checking...
                    </span>
                  ) : (
                    "I've verified"
                  )}
                </button>

                {/* Back to Login */}
                <button
                  type="button"
                  onClick={() => {
                    setShowVerificationModal(false)
                    setActiveTab('login')
                    setSignupEmail('')
                    setVerificationToken('')
                    setShowAdvanced(false)
                  }}
                  className="w-full bg-transparent text-gray-700 hover:text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors duration-300 border border-gray-300 hover:border-gray-400"
                >
                  Back to Login
                </button>

                {/* Advanced toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full text-xs text-gray-500 hover:text-gray-700 py-1 transition-colors"
                >
                  {showAdvanced ? 'Hide' : 'Show'} advanced options
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  )
}

