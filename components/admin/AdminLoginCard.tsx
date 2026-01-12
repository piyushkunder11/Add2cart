'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useAdminAuth } from '@/lib/demo/auth'
import { adminLoginSchema } from '@/lib/validation/admin'

interface FieldErrors {
  email?: string
  phone?: string
  password?: string
}

export default function AdminLoginCard() {
  const router = useRouter()
  const { login } = useAdminAuth()
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
    if (serverError) setServerError(null)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow digits, spaces, dashes, parentheses, +, and dots
    const cleaned = value.replace(/[^\d\s\-\(\)\+\.]/g, '')
    setFormData((prev) => ({ ...prev, phone: cleaned }))
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)
    setIsSubmitting(true)

    try {
      // Validate form
      const validatedData = adminLoginSchema.parse({
        email: formData.email.trim(),
        phone: formData.phone,
        password: formData.password,
      })

      // Use the admin auth store
      const result = await login(validatedData.email, validatedData.password)
      
      if (result.success) {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 300))
        // Redirect to home since admin dashboard is not available
        router.push('/')
        router.refresh()
      } else {
        setServerError(result.error || 'Invalid credentials. Use admin@demo.com / Demo@123')
        setIsSubmitting(false)
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: FieldErrors = {}
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof FieldErrors] = err.message
          }
        })
        setErrors(fieldErrors)
      }
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full"
    >
      {/* Back to site link */}
      <Link
        href="/"
        className="absolute -top-12 left-0 flex items-center gap-2 text-gray-600 hover:text-neutral-700 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded p-2"
        aria-label="Back to home"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="hidden sm:inline">Back to site</span>
      </Link>

      {/* Card */}
      <div className="relative bg-base/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-xl p-8 md:p-10">
        {/* Subtle glow background */}
        <div className="absolute -inset-1 bg-gradient-to-r from-black/10 to-black/5 rounded-2xl blur-xl -z-10" />

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative h-12 md:h-16 w-40 md:w-52">
            <Image
              src="/LOGO/add2cart-high-resolution-logo-transparent.png"
              alt="Add2Cart Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Headline */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Admin Access</h1>
          <p className="text-gray-600 text-sm">Sign in to access the admin dashboard</p>
        </div>

        {/* Server Error */}
        <AnimatePresence>
          {serverError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-neutral-100 border border-neutral-300 rounded-lg text-neutral-700 text-sm"
              role="alert"
              aria-live="assertive"
            >
              {serverError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-4 focus:ring-primary/30 transition-all ${
                errors.email ? 'border-neutral-600' : 'border-gray-300'
              }`}
              placeholder="admin@example.com"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-neutral-700" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone Field */}
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-4 focus:ring-primary/30 transition-all ${
                errors.phone ? 'border-neutral-600' : 'border-gray-300'
              }`}
              placeholder="+91 98765 43210"
              aria-invalid={errors.phone ? 'true' : 'false'}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
            />
            {errors.phone && (
              <p id="phone-error" className="mt-1 text-sm text-neutral-700" role="alert">
                {errors.phone}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-4 focus:ring-primary/30 transition-all ${
                  errors.password ? 'border-neutral-600' : 'border-gray-300'
                }`}
                placeholder="••••••••"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
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
            {errors.password && (
              <p id="password-error" className="mt-1 text-sm text-neutral-700" role="alert">
                {errors.password}
              </p>
            )}
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <button
              type="button"
              className="text-sm text-gray-600 hover:text-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative w-full px-6 py-3 bg-primary text-white hover:bg-neutral-800 active:bg-neutral-900 font-semibold rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-primary/30 overflow-hidden group"
          >
            <span className="relative z-10">
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </span>
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
              initial={false}
            />
          </motion.button>
        </form>

        {/* Demo Mode Notice */}
        <div className="mt-6 p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-700 text-xs text-center">
          Demo Mode: Use admin@demo.com / Demo@123
        </div>
      </div>
    </motion.div>
  )
}

