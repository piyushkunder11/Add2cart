'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store/cart'
import { formatINR } from '@/lib/utils/money'
import CartItemRow from './CartItemRow'
import Link from 'next/link'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter()
  const drawerRef = useRef<HTMLDivElement>(null)
  const items = useCartStore((state) => state.items)
  const subtotal = useCartStore((state) => state.getTotalPrice())
  const clearCart = useCartStore((state) => state.clearCart)

  // Focus trap
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const focusableElements = drawerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }

      document.addEventListener('keydown', handleTabKey)
      firstElement?.focus()

      return () => {
        document.removeEventListener('keydown', handleTabKey)
      }
    }
  }, [isOpen])

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleCheckout = () => {
    onClose()
    router.push('/checkout')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full md:w-[420px] bg-base z-50 shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-drawer-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
              <h2 id="cart-drawer-title" className="text-xl font-bold text-gray-900">
                Shopping Cart
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-900 hover:text-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded"
                aria-label="Close cart"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <svg
                    className="w-24 h-24 text-gray-300 mb-4"
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
                  <p className="text-gray-600 mb-6">Add some items to get started</p>
                  <Link
                    href="#best-seller"
                    onClick={onClose}
                    className="px-6 py-3 bg-primary text-white hover:bg-neutral-800 active:bg-neutral-900 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    Shop Best Sellers
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <CartItemRow key={`${item.id}-${item.variant || ''}`} item={item} index={index} isDrawer />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-gray-200 p-4 md:p-6 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-gray-900">Subtotal</span>
                  <span className="text-xl font-bold text-gray-900">{formatINR(subtotal)}</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Shipping calculated at checkout
                </p>
                <div className="space-y-3">
                  <Link
                    href="/cart"
                    onClick={onClose}
                    className="block w-full px-6 py-3 text-center border-2 border-black text-black hover:bg-black hover:text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    View Cart
                  </Link>
                  <motion.button
                    onClick={handleCheckout}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative w-full px-6 py-3 bg-primary text-white hover:bg-neutral-800 active:bg-neutral-900 font-semibold rounded-lg transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-primary/30 overflow-hidden group"
                  >
                    <span className="relative z-10">Checkout</span>
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                      initial={false}
                    />
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

