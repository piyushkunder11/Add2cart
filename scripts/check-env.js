/**
 * Quick script to verify Razorpay environment variables are set
 * Run with: node scripts/check-env.js
 */

require('dotenv').config({ path: '.env.local' })

const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
const keySecret = process.env.RAZORPAY_KEY_SECRET

console.log('\n=== Razorpay Environment Variables Check ===\n')

if (keyId) {
  console.log('✅ NEXT_PUBLIC_RAZORPAY_KEY_ID:', keyId.substring(0, 10) + '...')
} else {
  console.log('❌ NEXT_PUBLIC_RAZORPAY_KEY_ID: NOT SET')
}

if (keySecret) {
  console.log('✅ RAZORPAY_KEY_SECRET:', keySecret.substring(0, 5) + '...')
} else {
  console.log('❌ RAZORPAY_KEY_SECRET: NOT SET')
}

if (keyId && keySecret) {
  console.log('\n✅ All environment variables are set!')
  console.log('\n⚠️  IMPORTANT: Restart your Next.js dev server to load these variables:')
  console.log('   1. Stop the server (Ctrl+C)')
  console.log('   2. Run: npm run dev')
} else {
  console.log('\n❌ Missing environment variables. Please check your .env.local file.')
}

console.log('')


