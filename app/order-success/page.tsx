'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function OrderSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('id')
  const orderNumberFromUrl = searchParams.get('order_number')
  const [orderNumber, setOrderNumber] = useState<string | null>(orderNumberFromUrl)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!orderId) {
      // Redirect to home if no order ID
      router.push('/')
      return
    }

    // Order number is already in URL, no need to fetch
    if (orderNumberFromUrl) {
      setOrderNumber(orderNumberFromUrl)
    }
  }, [orderId, orderNumberFromUrl, router])

  if (!orderId) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#E0E0E0] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white rounded-2xl border border-gray-200 p-8 md:p-12 shadow-[0_10px_25px_rgba(0,0,0,0.08)] text-center"
      >
        {loading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mx-auto"></div>
            <p className="text-gray-600">Loading order details...</p>
          </div>
        ) : (
          <>
            {/* Success Icon */}
            <div className="mb-6">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-green-600"
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
              </div>
            </div>

            {/* Success Message */}
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              Order Placed Successfully!
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Thank you for your purchase. Your order has been confirmed.
            </p>

            {orderNumber && (
              <p className="text-sm text-gray-500 mb-8">
                Order Number: <span className="font-semibold text-gray-900">{orderNumber}</span>
              </p>
            )}

            <div className="bg-gray-50 rounded-lg p-4 mb-8 text-left">
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-semibold">Order ID:</span> {orderId}
              </p>
              <p className="text-sm text-gray-600">
                We&apos;ve sent a confirmation email with your order details. You can track your order
                from your account.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/order-history"
                className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors"
              >
                View Orders
              </Link>
              <Link
                href="/"
                className="px-6 py-3 border border-black text-black font-semibold rounded-lg hover:bg-black hover:text-white transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}

