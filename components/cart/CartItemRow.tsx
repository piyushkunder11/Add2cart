'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useCartStore } from '@/lib/store/cart'
import { formatINR } from '@/lib/utils/money'
import type { CartItem } from '@/lib/store/cart'

interface CartItemRowProps {
  item: CartItem
  index: number
  isDrawer?: boolean
}

export default function CartItemRow({ item, index, isDrawer = false }: CartItemRowProps) {
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)

  const handleQtyChange = (newQty: number) => {
    if (newQty < 1) {
      removeItem(item.id, item.variant)
    } else if (newQty > 10) {
      return // Max 10
    } else {
      updateQuantity(item.id, newQty, item.variant)
    }
  }

  const lineTotal = item.price * item.qty

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex gap-4 p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
    >
      {/* Image */}
      <div className="relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-gray-100">
        <Image
          src={item.image || 'https://via.placeholder.com/200x200?text=Product'}
          alt={item.title}
          fill
          className="object-cover"
          sizes="96px"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = 'https://via.placeholder.com/200x200?text=Product'
          }}
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{item.title}</h3>
        {item.variant && (
          <p className="text-sm text-gray-600 mb-2">Variant: {item.variant}</p>
        )}
        <p className="text-sm text-gray-600 mb-3">{formatINR(item.price)} each</p>

        {/* Qty Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
            <button
              onClick={() => handleQtyChange(item.qty - 1)}
              className="px-2 py-1 text-gray-900 hover:text-neutral-700 hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-l-lg"
              aria-label="Decrease quantity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="px-3 py-1 text-sm font-semibold text-gray-900 min-w-[2rem] text-center">
              {item.qty}
            </span>
            <button
              onClick={() => handleQtyChange(item.qty + 1)}
              className="px-2 py-1 text-gray-900 hover:text-neutral-700 hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-r-lg"
              aria-label="Increase quantity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>

          {/* Remove */}
          <button
            onClick={() => removeItem(item.id, item.variant)}
            className="text-black hover:text-neutral-700 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded px-2"
            aria-label="Remove item"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Line Total */}
      <div className="flex-shrink-0 text-right">
        <p className="font-bold text-gray-900">{formatINR(lineTotal)}</p>
      </div>
    </motion.div>
  )
}

