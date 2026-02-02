'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/home/Navbar'
import Hero from '@/components/home/Hero'
import SectionHeader from '@/components/home/SectionHeader'
import CategoryRow from '@/components/home/CategoryRow'
import Carousel from '@/components/home/Carousel'
import Footer from '@/components/home/Footer'
import DevToolbar from '@/components/home/DevToolbar'
import SkipToContent from '@/components/home/SkipToContent'
import AboutSection from '@/components/home/AboutSection'
import ContactSection from '@/components/home/ContactSection'
import { handleHashOnLoad, scrollToHash } from '@/lib/scroll'
import { useIsAdmin } from '@/lib/auth/useIsAdmin'
import ProductCard from '@/components/shop/ProductCard'
import AddProductCard from '@/components/shop/AddProductCard'
import { fetchProductsFromSupabase, fetchProductsByCategoryPattern, type Product, subscribeToProductsRealtime } from '@/lib/supabase/products'

export default function HomePage() {
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin()
  
  // Supabase products state - separate state for each category
  const [bestSellers, setBestSellers] = useState<Product[]>([])
  const [mensProducts, setMensProducts] = useState<Product[]>([])
  const [womensProducts, setWomensProducts] = useState<Product[]>([])
  const [thriftProducts, setThriftProducts] = useState<Product[]>([])
  const [accessoriesProducts, setAccessoriesProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      // Fetch all categories in parallel
      const [bestSeller, mens, womens, thrift, accessories] = await Promise.all([
        fetchProductsFromSupabase('best-seller'),
        fetchProductsByCategoryPattern('mens'),
        fetchProductsByCategoryPattern('womens'),
        fetchProductsByCategoryPattern('thrift'),
        fetchProductsFromSupabase('accessories'),
      ])
      
      setBestSellers(bestSeller)
      setMensProducts(mens)
      setWomensProducts(womens)
      setThriftProducts(thrift)
      setAccessoriesProducts(accessories)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load products from Supabase'
      // Error logging is kept for production debugging
      console.error('[HomePage] Error loading products:', error)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch products from Supabase on mount
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Realtime updates
  useEffect(() => {
    const unsubscribe = subscribeToProductsRealtime(() => {
      loadProducts()
    })
    return unsubscribe
  }, [loadProducts])

  // Handle hash navigation on load and when navigating from another page
  useEffect(() => {
    // Handle hash on initial load
    handleHashOnLoad(80)
    
    // Handle hash when navigating from another page (e.g., from /mens to /#mens)
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash) {
        setTimeout(() => {
          scrollToHash(hash, 80)
        }, 100)
      }
    }
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    
    // Also check hash after a short delay (for client-side navigation)
    const timeoutId = setTimeout(() => {
      const hash = window.location.hash
      if (hash) {
        scrollToHash(hash, 80)
      }
    }, 200)
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      clearTimeout(timeoutId)
    }
  }, [])

  const sectionVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  }

  return (
    <>
      <SkipToContent />
      <Navbar />
      <DevToolbar />
      <main id="main-content" className="min-h-screen bg-base pt-20">

        {/* Error State */}
        {error && (
          <div className="container mx-auto px-4 py-8">
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              <p className="font-semibold">Error loading products</p>
              <p className="text-sm mt-1">{error}</p>
              <button
                onClick={loadProducts}
                className="mt-2 text-sm underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Hero Section - Only for users, not admins */}
        {!isAdmin && (
          <section id="home">
            <Hero />
          </section>
        )}

        {/* Best Seller Section */}
        <section id="best-seller" className="container mx-auto px-4 py-16 md:py-24">
          <SectionHeader title="Best Seller" href="/best-seller" category="best-seller" />
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
          >
            {/* Show only 3 category preview cards */}
            <Link href="/best-seller?category=racing-jacket" className="block">
              <motion.div
                variants={sectionVariants}
                className="bg-base rounded-lg overflow-hidden border border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-300 cursor-pointer"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                  <Image
                    src="https://picsum.photos/id/1062/800/800"
                    alt="Racing Jacket"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">Racing Jacket</h3>
                  <p className="text-sm text-gray-600 mb-4">Explore our collection</p>
                </div>
              </motion.div>
            </Link>
            <Link href="/best-seller?category=leather-jacket" className="block">
              <motion.div
                variants={sectionVariants}
                className="bg-base rounded-lg overflow-hidden border border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-300 cursor-pointer"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                  <Image
                    src="https://picsum.photos/id/237/800/800"
                    alt="Leather Jacket"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">Leather Jacket</h3>
                  <p className="text-sm text-gray-600 mb-4">Explore our collection</p>
                </div>
              </motion.div>
            </Link>
            <Link href="/best-seller?category=bootcut-pant" className="block">
              <motion.div
                variants={sectionVariants}
                className="bg-base rounded-lg overflow-hidden border border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-300 cursor-pointer"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                  <Image
                    src="https://picsum.photos/id/366/800/800"
                    alt="Bootcut Pant"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">Bootcut Pant</h3>
                  <p className="text-sm text-gray-600 mb-4">Explore our collection</p>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </section>

        {/* Mens Section */}
        <section id="mens" className="container mx-auto px-4 py-16 md:py-24">
          <SectionHeader title="Mens" href="/mens" category="mens" />
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
          >
            {/* Show only 3 category preview cards */}
            <Link href="/mens?category=jacket" className="block">
              <motion.div
                variants={sectionVariants}
                className="bg-base rounded-lg overflow-hidden border border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-300 cursor-pointer"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                  <Image
                    src="https://picsum.photos/id/1062/800/800"
                    alt="Jacket"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">Jacket</h3>
                  <p className="text-sm text-gray-600 mb-4">Explore our collection</p>
                </div>
              </motion.div>
            </Link>
            <Link href="/mens?category=shirts" className="block">
              <motion.div
                variants={sectionVariants}
                className="bg-base rounded-lg overflow-hidden border border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-300 cursor-pointer"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                  <Image
                    src="https://picsum.photos/id/482/800/800"
                    alt="Shirts"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">Shirts</h3>
                  <p className="text-sm text-gray-600 mb-4">Explore our collection</p>
                </div>
              </motion.div>
            </Link>
            <Link href="/mens?category=t-shirt" className="block">
              <motion.div
                variants={sectionVariants}
                className="bg-base rounded-lg overflow-hidden border border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-300 cursor-pointer"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                  <Image
                    src="https://picsum.photos/id/1005/800/800"
                    alt="T Shirt"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">T Shirt</h3>
                  <p className="text-sm text-gray-600 mb-4">Explore our collection</p>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </section>

        {/* Womens Section */}
        <section id="womens" className="container mx-auto px-4 py-16 md:py-24">
          <SectionHeader title="Womens" href="/womens" category="womens" />
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
          >
            {/* Show only 3 category preview cards */}
            <Link href="/womens?category=shirts" className="block">
              <motion.div
                variants={sectionVariants}
                className="bg-base rounded-lg overflow-hidden border border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-300 cursor-pointer"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                  <Image
                    src="https://picsum.photos/id/1015/800/800"
                    alt="Shirts"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">Shirts</h3>
                  <p className="text-sm text-gray-600 mb-4">Explore our collection</p>
                </div>
              </motion.div>
            </Link>
            <Link href="/womens?category=tops" className="block">
              <motion.div
                variants={sectionVariants}
                className="bg-base rounded-lg overflow-hidden border border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-300 cursor-pointer"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                  <Image
                    src="https://picsum.photos/id/1020/800/800"
                    alt="Tops"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">Tops</h3>
                  <p className="text-sm text-gray-600 mb-4">Explore our collection</p>
                </div>
              </motion.div>
            </Link>
            <Link href="/womens?category=jeans" className="block">
              <motion.div
                variants={sectionVariants}
                className="bg-base rounded-lg overflow-hidden border border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-300 cursor-pointer"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                  <Image
                    src="https://picsum.photos/id/1023/800/800"
                    alt="Jeans"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">Jeans</h3>
                  <p className="text-sm text-gray-600 mb-4">Explore our collection</p>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </section>

        {/* Thrift Section */}
        <section id="thrift" className="container mx-auto px-4 py-16 md:py-24">
          <SectionHeader title="Thrift" href="/thrift" category="thrift" />
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
          >
            {/* Show only 3 category preview cards */}
            <Link href="/thrift?category=mens-jacket" className="block">
              <motion.div
                variants={sectionVariants}
                className="bg-base rounded-lg overflow-hidden border border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-300 cursor-pointer"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                  <Image
                    src="https://picsum.photos/id/1041/800/800"
                    alt="Mens Jacket"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">Mens Jacket</h3>
                  <p className="text-sm text-gray-600 mb-4">Explore our collection</p>
                </div>
              </motion.div>
            </Link>
            <Link href="/thrift?category=womens-jacket" className="block">
              <motion.div
                variants={sectionVariants}
                className="bg-base rounded-lg overflow-hidden border border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-300 cursor-pointer"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                  <Image
                    src="https://picsum.photos/id/1044/800/800"
                    alt="Womens Jacket"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">Womens Jacket</h3>
                  <p className="text-sm text-gray-600 mb-4">Explore our collection</p>
                </div>
              </motion.div>
            </Link>
            <Link href="/thrift?category=womens-jeans" className="block">
              <motion.div
                variants={sectionVariants}
                className="bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow duration-300 cursor-pointer"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                  <Image
                    src="https://picsum.photos/id/1047/800/800"
                    alt="Womens Jeans"
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">Womens Jeans</h3>
                  <p className="text-sm text-gray-600 mb-4">Explore our collection</p>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </section>

        {/* Accessories Section */}
        <section id="accessories" className="container mx-auto px-4 py-16 md:py-24">
          <SectionHeader title="Accessories" href="#accessories" />
          {isLoading ? (
            <div className="text-center py-16">
              <p className="text-gray-600">Loading products...</p>
            </div>
          ) : accessoriesProducts.length === 0 ? (
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
                  <AddProductCard category="accessories" />
                </motion.div>
              )}
            </div>
          ) : (
            <motion.div
              variants={sectionVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
            >
              {accessoriesProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product}
                  onRemove={(productId) => {
                    setAccessoriesProducts((prev) => prev.filter((p) => p.id !== productId))
                  }}
                />
              ))}
              {!isAdminLoading && isAdmin && <AddProductCard category="accessories" />}
            </motion.div>
          )}
        </section>

        {/* About Section */}
        <AboutSection />

        {/* Contact Section */}
        <ContactSection />

        <Footer />
      </main>
    </>
  )
}

