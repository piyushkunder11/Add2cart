/**
 * Validates Razorpay environment variables
 * Throws a clear error if required env vars are missing
 * 
 * LIVE MODE SAFETY: Blocks test keys in production
 */
function validateRazorpayEnv() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  const missing: string[] = []

  if (!keyId || keyId.trim() === '') {
    missing.push('NEXT_PUBLIC_RAZORPAY_KEY_ID')
  }

  if (!keySecret || keySecret.trim() === '') {
    missing.push('RAZORPAY_KEY_SECRET')
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required Razorpay environment variables:\n` +
        `  - ${missing.join('\n  - ')}\n\n` +
        `Please add these to your .env.local file.\n` +
        `See: https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/build-integration/`
    )
  }

  // LIVE MODE SAFETY CHECK: Block test keys in production
  if (process.env.NODE_ENV === 'production') {
    if (keyId && keyId.startsWith('rzp_test_')) {
      throw new Error(
        `SECURITY ERROR: Test Razorpay key detected in production!\n` +
        `  Key ID: ${keyId.substring(0, 15)}...\n` +
        `  Production requires LIVE keys (rzp_live_*).\n` +
        `  Please set NEXT_PUBLIC_RAZORPAY_KEY_ID to your LIVE key ID in Vercel environment variables.`
      )
    }
    if (keySecret && keySecret.length < 20) {
      // Test secrets are typically shorter; this is a heuristic check
      console.warn('[Razorpay] WARNING: Key secret appears suspiciously short. Ensure you are using LIVE credentials.')
    }
  }
}

/**
 * Gets the Razorpay Key ID from environment variables.
 * Validates that it exists before returning.
 * @throws Error if NEXT_PUBLIC_RAZORPAY_KEY_ID is not set
 */
export function getRazorpayKeyId(): string {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  if (!keyId || keyId.trim() === '') {
    validateRazorpayEnv() // Throw comprehensive error
    throw new Error('NEXT_PUBLIC_RAZORPAY_KEY_ID is not set')
  }
  
  // Validate env vars (includes LIVE safety check)
  validateRazorpayEnv()
  
  return keyId
}

/**
 * Detects Razorpay mode (test/live) from key ID
 * @returns 'test' | 'live' | 'unknown'
 */
export function getRazorpayMode(): 'test' | 'live' | 'unknown' {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  if (!keyId) return 'unknown'
  if (keyId.startsWith('rzp_test_')) return 'test'
  if (keyId.startsWith('rzp_live_')) return 'live'
  return 'unknown'
}

/**
 * Gets the Razorpay Key Secret from environment variables.
 * Validates that it exists before returning.
 * This should ONLY be used in server-side code.
 * @throws Error if RAZORPAY_KEY_SECRET is not set
 */
export function getRazorpayKeySecret(): string {
  if (typeof window !== 'undefined') {
    throw new Error('getRazorpayKeySecret() must only be called on the server')
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret || keySecret.trim() === '') {
    validateRazorpayEnv() // Throw comprehensive error
    throw new Error('RAZORPAY_KEY_SECRET is not set')
  }
  
  // Validate env vars (includes LIVE safety check)
  validateRazorpayEnv()
  
  return keySecret
}

/**
 * Gets the Razorpay Webhook Secret from environment variables.
 * Optional - only required if webhooks are enabled.
 * @throws Error if RAZORPAY_WEBHOOK_SECRET is not set (when required)
 */
export function getRazorpayWebhookSecret(): string | null {
  if (typeof window !== 'undefined') {
    throw new Error('getRazorpayWebhookSecret() must only be called on the server')
  }

  return process.env.RAZORPAY_WEBHOOK_SECRET || null
}
