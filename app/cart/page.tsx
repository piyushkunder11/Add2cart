'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useCartStore } from '@/lib/store/cart'
import { useAuthStore } from '@/lib/store/auth'
import { formatINR } from '@/lib/utils/money'
import CartItemRow from '@/components/cart/CartItemRow'
import { useRouter } from 'next/navigation'

export default function CartPage() {
  const router = useRouter()
  const items = useCartStore((state) => state.items)
  const subtotal = useCartStore((state) => state.getTotalPrice())
  const shipping = 0 // Will be calculated later
  const total = subtotal + shipping
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isAuthLoading = useAuthStore((state) => state.isLoading)

  const handleCheckout = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/cart')
      return
    }
    router.push('/checkout')
  }

  return (
    <div className="min-h-screen bg-base">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Shopping Cart</h1>
          <p className="text-gray-600">
            {items.length === 0
              ? 'Your cart is empty'
              : `${items.reduce((sum, item) => sum + item.qty, 0)} item${items.reduce((sum, item) => sum + item.qty, 0) > 1 ? 's' : ''} in your cart`}
          </p>
        </motion.div>

        {items.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto text-center py-16 md:py-24"
          >
            <svg
              className="w-32 h-32 md:w-48 md:h-48 text-gray-300 mx-auto mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Your cart is empty
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Looks like you haven&apos;t added anything to your cart yet. Start shopping to fill it up!
            </p>
            <Link
              href="/#best-seller"
              className="inline-block px-8 py-4 bg-primary text-white hover:bg-neutral-800 active:bg-neutral-900 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Explore Collections
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-base rounded-lg border border-gray-200 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
              >
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-700">
                  <div className="col-span-5">Product</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-3 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <CartItemRow key={`${item.id}-${item.variant || ''}`} item={item} index={index} />
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-base rounded-lg border border-gray-200 p-6 sticky top-20 shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold text-gray-900">{formatINR(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-sm text-gray-600">Calculated at checkout</span>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-primary">{formatINR(total)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <motion.button
                    onClick={handleCheckout}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isAuthLoading || !isAuthenticated}
                    className={`relative w-full px-6 py-3 font-semibold rounded-lg transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-primary/30 overflow-hidden group ${
                      isAuthLoading || !isAuthenticated
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-primary text-white hover:bg-neutral-800 active:bg-neutral-900'
                    }`}
                  >
                    <span className="relative z-10">
                      {isAuthLoading
                        ? 'Checking login...'
                        : isAuthenticated
                          ? 'Proceed to Checkout'
                          : 'Login to Checkout'}
                    </span>
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                      initial={false}
                    />
                  </motion.button>
                  {!isAuthenticated && !isAuthLoading && (
                    <p className="text-sm text-gray-600">
                      Please log in to continue with checkout.
                    </p>
                  )}
                  {!isAuthenticated && (
                    <Link
                      href="/login?redirect=/cart"
                      className="block w-full px-6 py-3 text-center border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      Login
                    </Link>
                  )}
                  <Link
                    href="/"
                    className="block w-full px-6 py-3 text-center border-2 border-black text-black hover:bg-black hover:text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

