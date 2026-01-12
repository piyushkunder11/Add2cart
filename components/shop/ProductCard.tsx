'use client'

import { useState, useCallback, memo } from 'react'
import { motion } from 'framer-motion'
import { useCartStore } from '@/lib/store/cart'
import { useIsAdmin } from '@/lib/auth/useIsAdmin'
import { type Product } from '@/lib/supabase/products'
import Image from 'next/image'
import Link from 'next/link'
import Toast from '@/components/ui/Toast'
import ProductKebabMenu from '@/components/admin/ProductKebabMenu'
import { useRouter } from 'next/navigation'

interface ProductCardProps {
  product: Product
  onRemove?: (productId: string) => void
  onRemoveError?: (message: string) => void
}

function ProductCard({ product, onRemove: onRemoveProp, onRemoveError: onRemoveErrorProp }: ProductCardProps) {
  const router = useRouter()
  const addItem = useCartStore((state) => state.addItem)
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin()

  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('Added to cart!')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [isNavigating, setIsNavigating] = useState(false)

  const price = product.priceCents / 100

  const handleQuickAdd = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!product.inStock) return
    addItem({
      id: product.id,
      title: product.title,
      price,
      image: product.image,
    })
    setToastMessage('Added to cart!')
    setShowToast(true)
  }, [product.id, product.title, product.image, product.inStock, price, addItem])

  const handleToggleStock = () => {
    router.refresh()
  }

  const handleRemove = (productId: string) => {
    // Call parent callback if provided
    if (onRemoveProp) {
      onRemoveProp(productId)
    }
    setToastMessage('Product removed successfully')
    setToastType('success')
    setShowToast(true)
    router.refresh()
  }

  const handleRemoveError = (message: string) => {
    // Call parent callback if provided
    if (onRemoveErrorProp) {
      onRemoveErrorProp(message)
    }
    setToastMessage(message)
    setToastType('error')
    setShowToast(true)
    router.refresh()
  }

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
        whileHover={{ y: -8 }}
        tabIndex={0}
        role="article"
        className="group relative bg-base rounded-lg overflow-hidden border border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Link 
          href={`/product/${product.id}`}
          prefetch={true}
          className="block"
          onClick={() => setIsNavigating(true)}
        >
          <div className="relative aspect-square overflow-hidden bg-gray-100">
            <Image
              src={product.image || 'https://via.placeholder.com/400x400?text=Product'}
              alt={product.title}
              fill
              loading="lazy"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = 'https://via.placeholder.com/400x400?text=Product'
              }}
            />

          {/* Out of Stock Badge */}
          {!product.inStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
              <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-sm">
                Out of Stock
              </span>
            </div>
          )}

          {/* Admin Kebab Menu */}
          {!isAdminLoading && isAdmin && (
            <div
              className="absolute top-2 right-2 z-20"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
              onKeyDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
              role="presentation"
            >
              <ProductKebabMenu
                productId={product.id}
                productTitle={product.title}
                isInStock={product.inStock}
                onToggleStock={handleToggleStock}
                onRemove={handleRemove}
                onRemoveError={handleRemoveError}
              />
            </div>
          )}
        </div>

            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.title}</h3>
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
              disabled={!product.inStock}
              whileHover={product.inStock ? { scale: 1.05 } : {}}
              whileTap={product.inStock ? { scale: 0.95 } : {}}
              className={`w-full px-4 py-2 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${product.inStock
                ? 'bg-primary text-white hover:bg-neutral-800 active:bg-neutral-900'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              {product.inStock ? 'Quick Add' : 'Out of Stock'}
            </motion.button>
          </div>
      </motion.article>

      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </>
  )
}

export default memo(ProductCard)

