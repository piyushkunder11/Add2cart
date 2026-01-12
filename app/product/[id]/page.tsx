'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store/cart'
import { useIsAdmin } from '@/lib/auth/useIsAdmin'
import Toast from '@/components/ui/Toast'
import { fetchProductById, type Product } from '@/lib/supabase/products'
import {
  appendVariantImages,
  createProductVariant,
  deleteProductImageByUrl,
  updateProductDescription,
  updateProductStock,
  removeVariantImage,
  deleteProductVariant,
  updateVariantSizes,
} from '@/lib/supabase/admin'
import { getSizeMeasurement, getProductTypeFromTags } from '@/lib/utils/sizeMeasurements'

interface ProductPageProps {
  params: {
    id: string
  }
}

const FALLBACK_IMAGE = 'https://via.placeholder.com/800x800?text=Product'
const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL']

const formatLabel = (label: string) =>
  label
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export default function ProductDetailPage({ params }: ProductPageProps) {
  const router = useRouter()
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin()
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [productImages, setProductImages] = useState<string[]>([])

  const addItem = useCartStore((state) => state.addItem)
  const cartItems = useCartStore((state) => state.items)

  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('Added to cart!')
  const [showImageCarousel, setShowImageCarousel] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const hasCartItems = cartItems.length > 0
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isNavigatingBack, setIsNavigatingBack] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [isSavingDescription, setIsSavingDescription] = useState(false)
  const [isTogglingStock, setIsTogglingStock] = useState(false)
  const [variantColor, setVariantColor] = useState('')
  const [variantSizes, setVariantSizes] = useState<string[]>([])
  const [variantFiles, setVariantFiles] = useState<FileList | null>(null)
  const [isCreatingVariant, setIsCreatingVariant] = useState(false)
  const [variantUploads, setVariantUploads] = useState<Record<string, FileList | null>>({})
  const [variantUploadPreviews, setVariantUploadPreviews] = useState<Record<string, Array<{ file: File; preview: string }>>>({})
  const [variantUploadLoading, setVariantUploadLoading] = useState<Record<string, boolean>>({})
  const [removingVariantImage, setRemovingVariantImage] = useState<string>('')
  const [removingVariant, setRemovingVariant] = useState<string>('')
  const [editingVariantSizes, setEditingVariantSizes] = useState<Record<string, string[]>>({})
  const [updatingVariantSizes, setUpdatingVariantSizes] = useState<string>('')

  const loadProduct = useCallback(async () => {
      try {
        setIsLoading(true)
        const result = await fetchProductById(params.id)
        if (result) {
          setProduct(result.product)
          setProductImages(result.images)
        setDescriptionDraft(result.product.description || '')
        }
      } catch (error) {
        console.error('Error loading product:', error)
      } finally {
        setIsLoading(false)
      }
  }, [params.id])

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  // Initialize selected image - prioritize variant images if color is selected
  useEffect(() => {
    if (selectedColor && product?.variants?.length) {
      const variant = product.variants.find((v) => v.color === selectedColor)
      if (variant?.images?.length) {
        setSelectedImage(variant.images[0])
        return
      }
    }
    // Fallback to product images or main image
    if (productImages.length > 0) {
      setSelectedImage(productImages[0])
    } else if (product?.image) {
      setSelectedImage(product.image)
    } else {
      setSelectedImage(FALLBACK_IMAGE)
    }
  }, [productImages, product, selectedColor])

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(variantUploadPreviews).forEach((previews) => {
        previews.forEach((p) => URL.revokeObjectURL(p.preview))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initialize variant selections
  useEffect(() => {
    if (product?.variants?.length) {
      const firstVariant = product.variants[0]
      setSelectedColor(firstVariant.color)
      setSelectedSize(firstVariant.sizes[0] || null)
      if (firstVariant.images?.length) {
        setSelectedImage(firstVariant.images[0])
      }
    } else {
      setSelectedColor(null)
      setSelectedSize(null)
    }
  }, [product])

  // Keep size & image in sync when color changes
  useEffect(() => {
    if (!selectedColor || !product?.variants?.length) return
    const variant = product.variants.find((v) => v.color === selectedColor)
    if (!variant) return
    if (!variant.sizes.includes(selectedSize || '')) {
      setSelectedSize(variant.sizes[0] || null)
    }
    // Update selected image to first image of selected variant
    if (variant.images?.length) {
      setSelectedImage(variant.images[0])
    } else {
      // If variant has no images, fallback to product image or placeholder
      setSelectedImage(product?.image || FALLBACK_IMAGE)
    }
  }, [selectedColor, product, selectedSize])

  const galleryImages = useMemo(() => {
    // If a color is selected, show only that variant's images
    if (selectedColor && product?.variants?.length) {
      const variant = product.variants.find((v) => v.color === selectedColor)
      if (variant?.images && variant.images.length > 0) {
        return variant.images
      }
    }
    
    // Fallback to all product images if no color selected or variant has no images
    if (productImages.length > 0) {
      return productImages
    }
    return product?.image ? [product.image] : [FALLBACK_IMAGE]
  }, [selectedColor, product, productImages])

  // Keyboard navigation for carousel
  useEffect(() => {
    if (!showImageCarousel) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowImageCarousel(false)
      } else if (e.key === 'ArrowLeft' && carouselIndex > 0) {
        setCarouselIndex((prev) => prev - 1)
      } else if (e.key === 'ArrowRight' && carouselIndex < galleryImages.length - 1) {
        setCarouselIndex((prev) => prev + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showImageCarousel, carouselIndex, galleryImages.length])

  const handleAddToCart = useCallback(() => {
    if (!product) return
    const isOutOfStock = !product.inStock
    const addDisabled = isOutOfStock
    
    const hasVariants = !!product.variants?.length
    if (hasVariants && (!selectedColor || !selectedSize)) {
      setSelectionError('Please select a colour and size')
      setToastMessage('Select a colour and size to continue')
      setShowToast(true)
      return
    }
    
    if (addDisabled || isAddingToCart) return
    setIsAddingToCart(true)
    
    const imageToUse = selectedImage || product.image || FALLBACK_IMAGE
    const price = product.priceCents / 100
    const variantLabel = hasVariants
      ? `Color: ${formatLabel(selectedColor || '')} | Size: ${selectedSize}`
      : undefined

    addItem({
      id: product.id,
      title: product.title,
      price,
      image: imageToUse,
      variant: variantLabel,
    })
    setToastMessage('Added to cart!')
    setShowToast(true)
    setSelectionError(null)
    
    // Reset after a short delay to prevent double-clicks
    setTimeout(() => setIsAddingToCart(false), 500)
  }, [isAddingToCart, selectedImage, product, addItem, selectedColor, selectedSize])

  const handleSaveDescription = useCallback(async () => {
    if (!product) return
    try {
      setIsSavingDescription(true)
      await updateProductDescription(product.id, descriptionDraft)
      await loadProduct()
      setToastMessage('Description updated')
      setShowToast(true)
    } catch (err) {
      console.error(err)
      setToastMessage('Failed to update description')
      setShowToast(true)
    } finally {
      setIsSavingDescription(false)
    }
  }, [product, descriptionDraft, loadProduct])

  const handleToggleStock = useCallback(async () => {
    if (!product) return
    try {
      setIsTogglingStock(true)
      await updateProductStock(product.id, !product.inStock)
      await loadProduct()
      setToastMessage('Stock status updated')
      setShowToast(true)
    } catch (err) {
      console.error(err)
      setToastMessage('Failed to update stock')
      setShowToast(true)
    } finally {
      setIsTogglingStock(false)
    }
  }, [product, loadProduct])

  const handleCreateVariant = useCallback(async () => {
    if (!product) return
    if (!variantColor.trim()) {
      setToastMessage('Enter a colour name')
      setShowToast(true)
      return
    }
    if (variantSizes.length === 0) {
      setToastMessage('Select at least one size')
      setShowToast(true)
      return
    }
    if (!variantFiles || variantFiles.length === 0) {
      setToastMessage('Upload at least one image')
      setShowToast(true)
      return
    }

    try {
      setIsCreatingVariant(true)
      await createProductVariant(
        product.id,
        {
          color: variantColor.trim(),
          sizes: variantSizes,
          images: Array.from(variantFiles),
        },
        product.title
      )
      setVariantColor('')
      setVariantSizes([])
      setVariantFiles(null)
      await loadProduct()
      setToastMessage('Variant added')
      setShowToast(true)
    } catch (err) {
      console.error(err)
      setToastMessage('Failed to add variant')
      setShowToast(true)
    } finally {
      setIsCreatingVariant(false)
    }
  }, [product, variantColor, variantSizes, variantFiles, loadProduct])

  const handleVariantFilesSelected = useCallback((variantId: string, files: FileList | null) => {
    if (!files || files.length === 0) {
      setVariantUploadPreviews((prev) => ({ ...prev, [variantId]: [] }))
      setVariantUploads((prev) => ({ ...prev, [variantId]: null }))
      return
    }

    const fileArray = Array.from(files)
    const previews = fileArray.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))

    setVariantUploadPreviews((prev) => ({ ...prev, [variantId]: previews }))
    setVariantUploads((prev) => ({ ...prev, [variantId]: files }))
  }, [])

  const handleRemoveSelectedFile = useCallback((variantId: string, index: number) => {
    setVariantUploadPreviews((prev) => {
      const current = prev[variantId] || []
      const updated = current.filter((_, i) => i !== index)
      // Revoke object URL to prevent memory leak
      URL.revokeObjectURL(current[index].preview)
      
      // Update FileList if there are remaining files
      if (updated.length === 0) {
        setVariantUploads((prevUploads) => ({ ...prevUploads, [variantId]: null }))
        return { ...prev, [variantId]: [] }
      }
      
      // Create new FileList from remaining files
      const dataTransfer = new DataTransfer()
      updated.forEach((item) => dataTransfer.items.add(item.file))
      setVariantUploads((prevUploads) => ({ ...prevUploads, [variantId]: dataTransfer.files }))
      
      return { ...prev, [variantId]: updated }
    })
  }, [])

  const handleAppendVariantImages = useCallback(
    async (variantId: string) => {
      if (!product) return
      const previews = variantUploadPreviews[variantId]
      if (!previews || previews.length === 0) {
        setToastMessage('Select images to upload')
        setShowToast(true)
        return
      }

      try {
        setVariantUploadLoading((prev) => ({ ...prev, [variantId]: true }))
        const files = previews.map((p) => p.file)
        await appendVariantImages(
          product.id,
          variantId,
          product.title,
          files
        )
        // Clean up preview URLs
        previews.forEach((p) => URL.revokeObjectURL(p.preview))
        setVariantUploadPreviews((prev) => ({ ...prev, [variantId]: [] }))
        setVariantUploads((prev) => ({ ...prev, [variantId]: null }))
        await loadProduct()
        setToastMessage('Images added to variant')
        setShowToast(true)
      } catch (err) {
        console.error(err)
        setToastMessage('Failed to add images')
        setShowToast(true)
      } finally {
        setVariantUploadLoading((prev) => ({ ...prev, [variantId]: false }))
      }
    },
    [product, variantUploadPreviews, loadProduct]
  )

  const handleRemoveVariantImage = useCallback(
    async (variantId: string, imageUrl: string) => {
      if (!product) return
      try {
        setRemovingVariantImage(imageUrl)
        await removeVariantImage(product.id, variantId, imageUrl)
        await loadProduct()
        setToastMessage('Image removed')
        setShowToast(true)
      } catch (err) {
        console.error(err)
        setToastMessage('Failed to remove image')
        setShowToast(true)
      } finally {
        setRemovingVariantImage('')
      }
    },
    [product, loadProduct]
  )

  const handleRemoveVariant = useCallback(
    async (variantId: string) => {
      if (!product) return
      try {
        setRemovingVariant(variantId)
        await deleteProductVariant(product.id, variantId)
        await loadProduct()
        setToastMessage('Colour removed')
        setShowToast(true)
      } catch (err) {
        console.error(err)
        setToastMessage('Failed to remove colour')
        setShowToast(true)
      } finally {
        setRemovingVariant('')
      }
    },
    [product, loadProduct]
  )

  const handleToggleVariantSize = useCallback((variantId: string, size: string) => {
    setEditingVariantSizes((prev) => {
      const currentSizes = prev[variantId] || []
      const variant = product?.variants?.find((v) => v.id === variantId)
      const baseSizes = variant?.sizes || []
      
      // Initialize with current sizes if not already editing
      if (!prev[variantId]) {
        return { ...prev, [variantId]: [...baseSizes] }
      }
      
      // Toggle the size
      const updatedSizes = currentSizes.includes(size)
        ? currentSizes.filter((s) => s !== size)
        : [...currentSizes, size]
      
      return { ...prev, [variantId]: updatedSizes }
    })
  }, [product])

  const handleSaveVariantSizes = useCallback(
    async (variantId: string) => {
      if (!product) return
      const sizes = editingVariantSizes[variantId]
      if (!sizes || sizes.length === 0) {
        setToastMessage('Select at least one size')
        setShowToast(true)
        return
      }
      
      try {
        setUpdatingVariantSizes(variantId)
        await updateVariantSizes(variantId, sizes)
        // Clear editing state
        setEditingVariantSizes((prev) => {
          const updated = { ...prev }
          delete updated[variantId]
          return updated
        })
        await loadProduct()
        setToastMessage('Sizes updated')
        setShowToast(true)
      } catch (err) {
        console.error(err)
        setToastMessage('Failed to update sizes')
        setShowToast(true)
      } finally {
        setUpdatingVariantSizes('')
      }
    },
    [product, editingVariantSizes, loadProduct]
  )

  const handleBack = useCallback(() => {
    if (isNavigatingBack) return
    setIsNavigatingBack(true)
    router.back()
  }, [router, isNavigatingBack])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <p className="text-center text-gray-600">Loading product...</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-4">
        {isAdmin ? (
          <>
            <h1 className="text-2xl font-semibold text-gray-900">
              Product removed successfully
            </h1>
            <p className="text-gray-600">
              This item has been deleted from your catalog. Use the category pages to continue managing products.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Go back
              </button>
              <Link
                href="/best-seller"
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                View catalog
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-gray-900">
              Product not found
            </h1>
            <p className="text-gray-600">
              The product you&apos;re looking for may have been removed or is unavailable right now.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Return to home
            </Link>
          </>
        )}
      </div>
    )
  }

  const price = product.priceCents / 100
  const isOutOfStock = !product.inStock
  const addDisabled = isOutOfStock

  return (
    <div className="container mx-auto px-4 pt-6 md:pt-8 pb-12 md:pb-16">
      <button
        type="button"
        onClick={handleBack}
        disabled={isNavigatingBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-neutral-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {isNavigatingBack ? 'Loading...' : 'Back'}
      </button>

      <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div 
            className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50 group max-w-md mx-auto lg:max-w-full cursor-pointer"
            onClick={() => {
              const currentIndex = galleryImages.findIndex(img => img === selectedImage)
              setCarouselIndex(currentIndex >= 0 ? currentIndex : 0)
              setShowImageCarousel(true)
            }}
          >
            <Image
              src={selectedImage || product.image || FALLBACK_IMAGE}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              priority
            />
            
            {/* Image Navigation Arrows */}
            {galleryImages.length > 1 && (
              <>
                {/* Previous Arrow */}
                {galleryImages.findIndex(img => img === selectedImage) > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const currentIndex = galleryImages.findIndex(img => img === selectedImage)
                      const prevIndex = currentIndex > 0 ? currentIndex - 1 : galleryImages.length - 1
                      setSelectedImage(galleryImages[prevIndex])
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-2 shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                    aria-label="Previous image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}

                {/* Next Arrow */}
                {galleryImages.findIndex(img => img === selectedImage) < galleryImages.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const currentIndex = galleryImages.findIndex(img => img === selectedImage)
                      const nextIndex = currentIndex < galleryImages.length - 1 ? currentIndex + 1 : 0
                      setSelectedImage(galleryImages[nextIndex])
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-2 shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                    aria-label="Next image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}

                {/* Click indicator overlay */}
                <div 
                  className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center pointer-events-none"
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2">
                    <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </div>
                </div>

                {/* Image Counter */}
                <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {galleryImages.findIndex(img => img === selectedImage) + 1} / {galleryImages.length}
                </div>
              </>
            )}
          </div>

          {galleryImages.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-3">
              {galleryImages.map((img, index) => {
                const isActive = img === selectedImage
                return (
                  <button
                    key={`${img}-${index}`}
                    onClick={() => {
                      setSelectedImage(img)
                      setCarouselIndex(index)
                      setShowImageCarousel(true)
                    }}
                    className={`relative aspect-square rounded-lg border transition-all cursor-pointer ${isActive
                      ? 'border-primary ring-2 ring-primary ring-offset-2'
                      : 'border-gray-200 hover:border-primary/60'
                      }`}
                  >
                    <Image
                      src={img}
                      alt={`Preview ${index + 1}`}
                      fill
                      loading="lazy"
                      className="object-cover rounded-lg"
                    />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              {product.title}
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-2xl md:text-3xl font-semibold text-gray-900">
                ₹{price.toLocaleString()}
              </p>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${isOutOfStock
                  ? 'bg-red-100 text-red-600'
                  : 'bg-emerald-100 text-emerald-600'
                  }`}
              >
                {isOutOfStock ? 'Out of Stock' : 'In Stock'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Description</h2>
            <p
              className="leading-relaxed text-sm md:text-base font-semibold bg-white p-3 rounded-lg border border-gray-200"
              style={{ color: '#000000' }}
            >
              {product.description?.trim()
                ? product.description
                : 'Discover premium quality and handpicked style with this piece from our collection. Pair it with your favorite staples for an effortless look that works day to night.'}
            </p>
          </div>

          {product.variants?.length ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">Available Colours</h3>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const isActive = variant.color === selectedColor
                    return (
                      <button
                        key={variant.color}
                        type="button"
                        onClick={() => {
                          setSelectedColor(variant.color)
                          setSelectionError(null)
                        }}
                        className={`px-3 py-1 rounded-full border text-sm font-semibold transition-colors capitalize ${
                          isActive
                            ? 'bg-primary text-white border-primary'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {formatLabel(variant.color)}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Available Sizes</h3>
                  {selectedSize && (() => {
                    const productType = getProductTypeFromTags(product.tags)
                    const measurement = getSizeMeasurement(productType, selectedSize)
                    return measurement ? (
                      <span className="text-sm text-gray-600 font-medium">
                        Size: {selectedSize} {measurement.display}
                      </span>
                    ) : null
                  })()}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.variants
                    .find((v) => v.color === selectedColor)
                    ?.sizes.map((size) => {
                      const isActive = size === selectedSize
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setSelectedSize(size)
                            setSelectionError(null)
                          }}
                          className={`w-12 h-12 rounded-full border text-sm font-semibold transition-colors ${
                            isActive
                              ? 'bg-primary text-white border-primary'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {size}
                        </button>
                      )
                    })}
                </div>
              </div>

              {selectionError && (
                <p className="text-sm text-red-600">{selectionError}</p>
              )}
            </div>
          ) : isAdmin ? (
            <div className="rounded-lg border-2 border-dashed border-yellow-400 bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-800">
                ⚠️ Please add at least one colour variant for this product.
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Use the Admin Controls below to add colour variants with sizes and images.
              </p>
            </div>
          ) : null}


          {!isAdmin && (
          <div className="space-y-4">
            <button
              onClick={handleAddToCart}
              disabled={addDisabled || isAddingToCart}
              className={`w-full px-6 py-3 text-base font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${addDisabled || isAddingToCart
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-neutral-800 active:bg-neutral-900'
                }`}
            >
              {isAddingToCart
                ? 'Adding...'
                : isOutOfStock
                  ? 'Currently Unavailable'
                    : 'Add to Cart'}
            </button>
            {hasCartItems ? (
              <Link
                href="/cart"
                prefetch={true}
                className="w-full px-6 py-3 text-base font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 border border-black text-black bg-white hover:bg-gray-100 hover:text-black text-center block"
              >
                View Cart
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="w-full px-6 py-3 text-base font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 border border-gray-300 text-black bg-gray-100 cursor-not-allowed"
              >
                View Cart
              </button>
            )}
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 space-y-1">
              <p>• Free shipping on orders above ₹2,000</p>
              <p>• Easy 7-day returns and exchanges</p>
              <p>• Secure payments via Razorpay</p>
            </div>
          </div>
          )}

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Product Details</h2>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Classic colourway curated for everyday styling</li>
                <li>Relaxed fit that works across multiple sizes</li>
              <li>Care: Machine wash cold, tumble dry low</li>
              <li>Material: Premium cotton blend for all-day comfort</li>
            </ul>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-12 space-y-6 border-t border-gray-200 pt-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Admin Controls</h3>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Internal</span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-800">Description</label>
                  <textarea
                    value={descriptionDraft}
                    onChange={(e) => setDescriptionDraft(e.target.value)}
                    className="w-full min-h-[120px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  />
                  <button
                    type="button"
                    onClick={handleSaveDescription}
                    disabled={isSavingDescription}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60"
                  >
                    {isSavingDescription ? 'Saving...' : 'Save Description'}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-gray-800">Stock Status</label>
                  <button
                    type="button"
                    onClick={handleToggleStock}
                    disabled={isTogglingStock}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      product.inStock
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    } disabled:opacity-60`}
                  >
                    {isTogglingStock
                      ? 'Updating...'
                      : product.inStock
                        ? 'Mark Out of Stock'
                        : 'Mark In Stock'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-800">Add New Colour Variant</label>
                  <input
                    type="text"
                    placeholder="Colour name (e.g., black)"
                    value={variantColor}
                    onChange={(e) => setVariantColor(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  />
                  <div className="flex flex-wrap gap-2">
                    {SIZE_OPTIONS.map((s) => {
                      const active = variantSizes.includes(s)
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            setVariantSizes((prev) =>
                              prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                            )
                          }
                          className={`w-10 h-10 rounded-full border text-sm font-semibold transition-colors ${
                            active ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-700'
                          }`}
                        >
                          {s}
                        </button>
                      )
                    })}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setVariantFiles(e.target.files)}
                    className="block text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleCreateVariant}
                    disabled={isCreatingVariant}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60"
                  >
                    {isCreatingVariant ? 'Adding...' : 'Add Variant'}
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-800">Existing Variants & Images</p>
                  {!product.variants || product.variants.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-yellow-400 bg-yellow-50 p-4">
                      <p className="text-sm font-semibold text-yellow-800">
                        ⚠️ No colour variants added yet
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Please add at least one colour variant above with sizes and images.
                      </p>
                    </div>
                  ) : (
                    product.variants.map((variant) => {
                      const variantId = variant.id || ''
                      const isEditingSizes = editingVariantSizes[variantId] !== undefined
                      const currentSizes = isEditingSizes ? editingVariantSizes[variantId] : variant.sizes
                      
                      return (
                      <div key={variant.id} className="rounded-lg border border-gray-200 p-3 space-y-3">
                        <div className="flex flex-wrap items-center gap-2 justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold capitalize">{formatLabel(variant.color)}</span>
                            {!isEditingSizes && (
                              <span className="text-xs text-gray-500">{variant.sizes.join(', ') || 'No sizes'}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(variant.id || '')}
                            disabled={removingVariant === variant.id}
                            className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-60"
                          >
                            {removingVariant === variant.id ? 'Removing...' : 'Remove Colour'}
                          </button>
                        </div>

                        {/* Size Editing Section */}
                        <div className="space-y-2 border-t border-gray-100 pt-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-gray-800">Available Sizes</label>
                            {!isEditingSizes && (
                              <button
                                type="button"
                                onClick={() => setEditingVariantSizes((prev) => ({ ...prev, [variantId]: [...variant.sizes] }))}
                                className="text-xs text-primary hover:text-neutral-800 font-semibold"
                              >
                                Edit Sizes
                              </button>
                            )}
                          </div>
                          {isEditingSizes ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {SIZE_OPTIONS.map((size) => {
                                  const isSelected = currentSizes.includes(size)
                                  return (
                                    <button
                                      key={size}
                                      type="button"
                                      onClick={() => handleToggleVariantSize(variantId, size)}
                                      className={`w-10 h-10 rounded-full border text-sm font-semibold transition-colors ${
                                        isSelected
                                          ? 'bg-primary text-white border-primary'
                                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                      }`}
                                    >
                                      {size}
                                    </button>
                                  )
                                })}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveVariantSizes(variantId)}
                                  disabled={updatingVariantSizes === variantId || currentSizes.length === 0}
                                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {updatingVariantSizes === variantId ? 'Saving...' : 'Save Sizes'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingVariantSizes((prev) => {
                                      const updated = { ...prev }
                                      delete updated[variantId]
                                      return updated
                                    })
                                  }}
                                  disabled={updatingVariantSizes === variantId}
                                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-300 disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {variant.sizes.length > 0 ? (
                                variant.sizes.map((size) => (
                                  <span
                                    key={size}
                                    className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold"
                                  >
                                    {size}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-500">No sizes available</span>
                              )}
                            </div>
                          )}
                        </div>

                      <div className="flex flex-wrap gap-3">
                        {(variant.images || []).length === 0 && (
                          <span className="text-xs text-gray-500">No images</span>
                        )}
                        {(variant.images || []).map((img) => (
                          <div key={img} className="relative group">
                            <button
                              type="button"
                              onClick={() => handleRemoveVariantImage(variant.id || '', img)}
                              disabled={removingVariantImage === img}
                              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 text-xs font-bold opacity-90 hover:opacity-100 disabled:opacity-50"
                              title="Remove image"
                            >
                              {removingVariantImage === img ? '…' : '×'}
                            </button>
                            <div className="w-20 h-20 rounded border overflow-hidden">
                              <Image src={img} alt={variant.color} width={80} height={80} className="object-cover w-full h-full" />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleVariantFilesSelected(variant.id || '', e.target.files)}
                          className="block text-sm"
                        />
                        
                        {/* Preview selected images */}
                        {variantUploadPreviews[variant.id || '']?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {variantUploadPreviews[variant.id || ''].map((preview, idx) => (
                              <div key={idx} className="relative group">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSelectedFile(variant.id || '', idx)}
                                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 text-xs font-bold opacity-90 hover:opacity-100 z-10"
                                  title="Remove from selection"
                                >
                                  ×
                                </button>
                                <div className="w-20 h-20 rounded border overflow-hidden">
                                  <Image
                                    src={preview.preview}
                                    alt={`Preview ${idx + 1}`}
                                    width={80}
                                    height={80}
                                    className="object-cover w-full h-full"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <button
                          type="button"
                          onClick={() => handleAppendVariantImages(variant.id || '')}
                          disabled={variantUploadLoading[variant.id || ''] || !variantUploadPreviews[variant.id || '']?.length}
                          className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {variantUploadLoading[variant.id || ''] ? 'Uploading...' : 'Upload Selected Images'}
                        </button>
                      </div>
                    </div>
                    )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Carousel Modal */}
      <AnimatePresence>
        {showImageCarousel && galleryImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowImageCarousel(false)}
          >
            <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center">
              {/* Close Button */}
              <button
                onClick={() => setShowImageCarousel(false)}
                className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
                aria-label="Close carousel"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Previous Button */}
              {galleryImages.length > 1 && carouselIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCarouselIndex((prev) => prev - 1)
                  }}
                  className="absolute left-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors"
                  aria-label="Previous image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {/* Image */}
              <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <div className="relative w-full aspect-square max-h-[80vh]">
                  <Image
                    src={galleryImages[carouselIndex]}
                    alt={`${product.title} - Image ${carouselIndex + 1}`}
                    fill
                    className="object-contain"
                    sizes="90vw"
                    priority
                  />
                </div>
              </div>

              {/* Next Button */}
              {galleryImages.length > 1 && carouselIndex < galleryImages.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCarouselIndex((prev) => prev + 1)
                  }}
                  className="absolute right-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors"
                  aria-label="Next image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {/* Image Counter */}
              {galleryImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                  {carouselIndex + 1} / {galleryImages.length}
                </div>
              )}

              {/* Thumbnail Navigation */}
              {galleryImages.length > 1 && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation()
                        setCarouselIndex(idx)
                      }}
                      className={`relative w-16 h-16 rounded-lg border-2 overflow-hidden flex-shrink-0 transition-all ${
                        idx === carouselIndex
                          ? 'border-white scale-110'
                          : 'border-white/30 hover:border-white/60'
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast
        message={toastMessage}
        type="success"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  )
}


