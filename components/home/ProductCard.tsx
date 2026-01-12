'use client'

import { useState, KeyboardEvent, useCallback, memo } from 'react'
import { motion } from 'framer-motion'
import { useCartStore } from '@/lib/store/cart'
import Image from 'next/image'
import Link from 'next/link'
import Toast from '@/components/ui/Toast'

interface ProductCardProps {
  id: string
  title: string
  price: number
  image: string
}

function ProductCard({ id, title, price, image }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)
  const [showToast, setShowToast] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  const handleQuickAdd = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      id,
      title,
      price,
      image,
    })
    setShowToast(true)
  }, [id, title, price, image, addItem])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsNavigating(true)
    }
  }, [])

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -8 }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      className="group bg-base rounded-lg overflow-hidden border border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Link 
        href={`/product/${id}`}
        prefetch={true}
        className="block"
        onClick={() => setIsNavigating(true)}
      >
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <Image
            src={image || 'https://via.placeholder.com/400x400?text=Product'}
            alt={title}
            fill
            loading="lazy"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = 'https://via.placeholder.com/400x400?text=Product'
            }}
          />
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{title}</h3>
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-gray-900">₹{price.toLocaleString()}</p>
            {isNavigating && (
              <div className="px-4 py-2 text-sm font-semibold text-primary">
                Loading...
              </div>
            )}
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4">
        <motion.button
          onClick={handleQuickAdd}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full px-4 py-2 bg-primary text-white hover:bg-neutral-800 active:bg-neutral-900 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Quick Add
        </motion.button>
      </div>
      <Toast
        message="Added to cart!"
        type="success"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </motion.article>
  )
}

export default memo(ProductCard)

