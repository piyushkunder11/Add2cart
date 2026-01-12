/**
 * Validates Razorpay environment variables
 * Throws a clear error if required env vars are missing
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
  return keyId
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
  return keySecret
}

