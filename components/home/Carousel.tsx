'use client'

import { motion } from 'framer-motion'
import ProductCard from '@/components/shop/ProductCard'
import { type Product } from '@/lib/supabase/products'
import { useRef } from 'react'
import { useIsAdmin } from '@/lib/auth/useIsAdmin'
import AddProductCard from '@/components/shop/AddProductCard'

interface CarouselProps {
  products: Product[]
  category: string
}

export default function Carousel({ products, category }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin()

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="flex-shrink-0 w-[280px] md:w-[320px]"
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      {!isAdminLoading && isAdmin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
            className="flex-shrink-0 w-[280px] md:w-[320px]"
          >
            <AddProductCard category={category} />
          </motion.div>
        )}
      </div>
      <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 left-0 right-0 justify-between pointer-events-none">
        <button
          onClick={() => scroll('left')}
          className="pointer-events-auto bg-base/90 hover:bg-base shadow-lg rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Scroll left"
        >
          <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => scroll('right')}
          className="pointer-events-auto bg-base/90 hover:bg-base shadow-lg rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Scroll right"
        >
          <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

