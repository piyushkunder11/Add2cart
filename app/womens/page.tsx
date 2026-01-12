'use client'

export const dynamic = 'force-dynamic'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useIsAdmin } from '@/lib/auth/useIsAdmin'
import { formatINR } from '@/lib/utils/money'
import ProductKebabMenu from '@/components/admin/ProductKebabMenu'
import AddProductCard from '@/components/shop/AddProductCard'
import { useState, useEffect, useMemo, useCallback } from 'react'
import Toast from '@/components/ui/Toast'
import { fetchProductsByCategoryPattern, type Product, subscribeToProductsRealtime } from '@/lib/supabase/products'

const categories = [
  { name: 'SHIRTS', slug: 'shirts' },
  { name: 'TOPS', slug: 'tops' },
  { name: 'JEANS', slug: 'jeans' },
  { name: 'PANTS', slug: 'pants' },
  { name: 'WESTERN OUTFITS', slug: 'western-outfits' },
  { name: 'KURTIS', slug: 'kurti' },
]

export default function WomensPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin()

  // Get category from URL query params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const category = params.get('category')
      if (category) {
        setSelectedCategory(category)
      }
    }
  }, [])

  // Fetch products from Supabase
  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      const fetchedProducts = await fetchProductsByCategoryPattern('womens')
      setProducts(fetchedProducts)
    } catch (error) {
      console.error('Error loading products from Supabase:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    const unsubscribe = subscribeToProductsRealtime(() => {
      loadProducts()
    })
    return unsubscribe
  }, [loadProducts])

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) {
      return products
    }
    return products.filter((p) => {
      // Check if subcategory matches (e.g., womens-shirts matches shirts)
      if (p.subcategory === `womens-${selectedCategory}` || p.subcategory === selectedCategory) {
        return true
      }
      return false
    })
  }, [selectedCategory, products])

  const getProductStockStatus = (productId: string) => {
    const product = products.find(p => p.id === productId)
    return product?.inStock ?? true
  }

  const handleToggleStock = () => {
    router.refresh()
  }

  const handleRemove = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId))
    setToastMessage('Product removed successfully')
    setToastType('success')
    setShowToast(true)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-base">
      {/* Header */}
      <div className="border-b border-gray-200 bg-base sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/#womens"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg px-3 py-2 hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Back to Home</span>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 uppercase tracking-tight">WOMENS</h1>
            <div className="w-24" /> {/* Spacer for centering */}
          </div>

          {/* Category Filters - Centered */}
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                selectedCategory === null
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  selectedCategory === cat.slug
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        {isLoading ? (
          <div className="text-center py-16">
            <p className="text-gray-600">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div>
            <div className="text-center py-16">
              <p className="text-gray-600 text-lg mb-2">No products yet</p>
              <p className="text-gray-500 text-sm">
                {!isAdminLoading && isAdmin
                  ? 'Add your first product using the "Add Product" card below.'
                  : 'Check back soon for new products!'}
              </p>
            </div>
            {!isAdminLoading && isAdmin && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md mx-auto"
              >
                <AddProductCard 
                  category="womens" 
                  subcategory={selectedCategory ? `womens-${selectedCategory}` : undefined} 
                />
              </motion.div>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
          >
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => router.push(`/product/${product.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    router.push(`/product/${product.id}`)
                  }
                }}
                tabIndex={0}
                role="button"
                className="bg-base rounded-lg overflow-hidden border border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {/* Product Image */}
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = 'https://via.placeholder.com/400x500?text=Product'
                    }}
                  />
                  {!getProductStockStatus(product.id) && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                      <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-sm">
                        Out of Stock
                      </span>
                    </div>
                  )}
                  {!isAdminLoading && isAdmin && (
                    <div
                      className="absolute top-3 right-3 z-10"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      role="presentation"
                    >
                      <ProductKebabMenu
                        productId={product.id}
                        productTitle={product.title}
                        isInStock={getProductStockStatus(product.id)}
                        onToggleStock={handleToggleStock}
                        onRemove={handleRemove}
                      />
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="p-4 md:p-6">
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg line-clamp-2">
                    {product.title}
                  </h3>

                  {/* Price */}
                  <p className="text-sm text-gray-600 mb-6">
                    MRP {formatINR(product.priceCents / 100)}.00 (Inclusive of All Taxes)
                  </p>
                  {/* View Product CTA */}
                  <div className="pt-2">
                    <div
                      className={`w-full px-4 py-3 font-semibold rounded-lg text-center border-2 transition-colors ${
                        getProductStockStatus(product.id)
                          ? 'border-primary text-primary hover:bg-primary hover:text-white'
                          : 'border-gray-300 text-gray-500'
                      }`}
                    >
                      {getProductStockStatus(product.id) ? 'View Product' : 'Out of Stock'}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            {!isAdminLoading && isAdmin && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <AddProductCard 
                  category="womens" 
                  subcategory={selectedCategory ? `womens-${selectedCategory}` : undefined} 
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  )
}
