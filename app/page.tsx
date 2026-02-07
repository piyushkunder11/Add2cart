'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
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
import { fetchSubcategoriesByParentSlug, type Category } from '@/lib/supabase/categories'
import CategoryCard from '@/components/home/CategoryCard'

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
  
  // Category state
  const [bestSellerCategories, setBestSellerCategories] = useState<Category[]>([])
  const [mensCategories, setMensCategories] = useState<Category[]>([])
  const [womensCategories, setWomensCategories] = useState<Category[]>([])
  const [thriftCategories, setThriftCategories] = useState<Category[]>([])
  const [accessoriesCategories, setAccessoriesCategories] = useState<Category[]>([])

  const loadCategories = useCallback(async () => {
    try {
      // Fetch all categories in parallel
      const [bestSellerCats, mensCats, womensCats, thriftCats, accessoriesCats] = await Promise.all([
        fetchSubcategoriesByParentSlug('best-seller'),
        fetchSubcategoriesByParentSlug('mens'),
        fetchSubcategoriesByParentSlug('womens'),
        fetchSubcategoriesByParentSlug('thrift'),
        fetchSubcategoriesByParentSlug('accessories'),
      ])
      
      // Set categories (limit to 3 for display)
      setBestSellerCategories(bestSellerCats.slice(0, 3))
      setMensCategories(mensCats.slice(0, 3))
      setWomensCategories(womensCats.slice(0, 3))
      setThriftCategories(thriftCats.slice(0, 3))
      setAccessoriesCategories(accessoriesCats.slice(0, 3))
    } catch (error) {
      console.error('[HomePage] Error loading categories:', error)
    }
  }, [])

  // Update category image in state immediately after upload so the card shows the new image
  const handleCategoryImageChange = useCallback((categoryId: string, newImageUrl: string) => {
    const updateImage = (prev: Category[]) =>
      prev.map((c) => (c.id === categoryId ? { ...c, image_url: newImageUrl } : c))
    setBestSellerCategories(updateImage)
    setMensCategories(updateImage)
    setWomensCategories(updateImage)
    setThriftCategories(updateImage)
    setAccessoriesCategories(updateImage)
  }, [])

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      // Fetch all products and categories in parallel
      const [bestSeller, mens, womens, thrift, accessories, bestSellerCats, mensCats, womensCats, thriftCats, accessoriesCats] = await Promise.all([
        fetchProductsFromSupabase('best-seller'),
        fetchProductsByCategoryPattern('mens'),
        fetchProductsByCategoryPattern('womens'),
        fetchProductsByCategoryPattern('thrift'),
        fetchProductsFromSupabase('accessories'),
        fetchSubcategoriesByParentSlug('best-seller'),
        fetchSubcategoriesByParentSlug('mens'),
        fetchSubcategoriesByParentSlug('womens'),
        fetchSubcategoriesByParentSlug('thrift'),
        fetchSubcategoriesByParentSlug('accessories'),
      ])
      
      setBestSellers(bestSeller)
      setMensProducts(mens)
      setWomensProducts(womens)
      setThriftProducts(thrift)
      setAccessoriesProducts(accessories)
      
      // Set categories (limit to 3 for display)
      setBestSellerCategories(bestSellerCats.slice(0, 3))
      setMensCategories(mensCats.slice(0, 3))
      setWomensCategories(womensCats.slice(0, 3))
      setThriftCategories(thriftCats.slice(0, 3))
      setAccessoriesCategories(accessoriesCats.slice(0, 3))
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
            {bestSellerCategories.length > 0 ? (
              bestSellerCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  href={`/best-seller?category=${category.slug}`}
                  onImageChange={handleCategoryImageChange}
                />
              ))
            ) : (
              // Fallback to placeholder cards if no categories found
              <>
                <div className="bg-base rounded-lg overflow-hidden border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No categories available</p>
                </div>
                <div className="bg-base rounded-lg overflow-hidden border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No categories available</p>
                </div>
                <div className="bg-base rounded-lg overflow-hidden border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No categories available</p>
                </div>
              </>
            )}
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
            {mensCategories.length > 0 ? (
              mensCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  href={`/mens?category=${category.slug}`}
                  onImageChange={handleCategoryImageChange}
                />
              ))
            ) : (
              <>
                <div className="bg-base rounded-lg overflow-hidden border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No categories available</p>
                </div>
                <div className="bg-base rounded-lg overflow-hidden border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No categories available</p>
                </div>
                <div className="bg-base rounded-lg overflow-hidden border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No categories available</p>
                </div>
              </>
            )}
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
            {womensCategories.length > 0 ? (
              womensCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  href={`/womens?category=${category.slug}`}
                  onImageChange={handleCategoryImageChange}
                />
              ))
            ) : (
              <>
                <div className="bg-base rounded-lg overflow-hidden border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No categories available</p>
                </div>
                <div className="bg-base rounded-lg overflow-hidden border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No categories available</p>
                </div>
                <div className="bg-base rounded-lg overflow-hidden border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No categories available</p>
                </div>
              </>
            )}
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
            {thriftCategories.length > 0 ? (
              thriftCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  href={`/thrift?category=${category.slug}`}
                  onImageChange={handleCategoryImageChange}
                />
              ))
            ) : (
              <>
                <div className="bg-base rounded-lg overflow-hidden border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No categories available</p>
                </div>
                <div className="bg-base rounded-lg overflow-hidden border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No categories available</p>
                </div>
                <div className="bg-base rounded-lg overflow-hidden border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No categories available</p>
                </div>
              </>
            )}
          </motion.div>
        </section>

        {/* Accessories Section */}
        <section id="accessories" className="container mx-auto px-4 py-16 md:py-24">
          <SectionHeader title="Accessories" href="#accessories" category="accessories" />
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
          >
            {accessoriesCategories.length > 0 ? (
              accessoriesCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  href={`#accessories?category=${category.slug}`}
                  onImageChange={handleCategoryImageChange}
                />
              ))
            ) : (
              <>
                <div className="bg-base rounded-lg overflow-hidden border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No categories available</p>
                </div>
                <div className="bg-base rounded-lg overflow-hidden border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No categories available</p>
                </div>
                <div className="bg-base rounded-lg overflow-hidden border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No categories available</p>
                </div>
              </>
            )}
          </motion.div>
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

