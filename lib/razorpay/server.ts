import Razorpay from 'razorpay'
import { getRazorpayKeyId, getRazorpayKeySecret, getRazorpayMode } from './env-validation'

/**
 * Masks a Razorpay key for safe logging.
 * Example: rzp_test_RxmPZiwRq35bGo -> rzp_t***********5bGo
 */
function maskKey(key: string): string {
  if (!key) return ''
  const visibleStart = 5
  const visibleEnd = 4

  if (key.length <= visibleStart + visibleEnd) {
    return '*'.repeat(key.length)
  }

  const start = key.slice(0, visibleStart)
  const end = key.slice(-visibleEnd)
  const masked = '*'.repeat(key.length - visibleStart - visibleEnd)

  return `${start}${masked}${end}`
}

/**
 * Singleton Razorpay client instance for server-side usage only.
 *
 * IMPORTANT:
 * - This file must only be imported in server-side code (e.g. Next.js route handlers, server components).
 * - Never import this from a client component.
 */
let razorpayInstance: Razorpay | null = null

export function getRazorpayClient(): Razorpay {
  if (typeof window !== 'undefined') {
    // Extra safety: guard against accidental client-side usage
    throw new Error('getRazorpayClient() must only be called on the server')
  }

  if (!razorpayInstance) {
    const key_id = getRazorpayKeyId()
    const key_secret = getRazorpayKeySecret()
    const mode = getRazorpayMode()

    // Safe logging with masked keys and mode (dev only)
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[Razorpay] Initializing server client in ${mode.toUpperCase()} mode:`,
        `key_id=${maskKey(key_id)}`,
        `key_secret=${maskKey(key_secret)}`
      )
    } else {
      // In production, only log mode (no keys)
      console.log(`[Razorpay] Server client initialized in ${mode.toUpperCase()} mode`)
    }

    razorpayInstance = new Razorpay({
      key_id,
      key_secret,
    })
  }

  return razorpayInstance
}


