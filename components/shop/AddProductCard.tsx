'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import Toast from '@/components/ui/Toast'
import { createProduct, getCategoryIdBySlug, getOrCreateSubcategoryId } from '@/lib/supabase/admin'
import { generateUniqueSlug } from '@/lib/utils/slug'

const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  priceCents: z.number().min(1, 'Price must be greater than 0'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  inStock: z.boolean(),
})

interface AddProductCardProps {
  category: string
  subcategory?: string
}

export default function AddProductCard({ category, subcategory }: AddProductCardProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [imagePreview, setImagePreview] = useState<string>('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [step, setStep] = useState<1 | 2>(1)

  // choices
  const availableColors = ['black','white','beige','brown','blue','offwhite','green','red','yellow']
  const sizeOptions = ['S','M','L','XL','XXL']
  
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: category,
    subcategory: subcategory || '',
    image: '',
    inStock: true,
    productType: '' as 'upper-wear' | 'bottom-wear' | '',
  })

  const modalRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // step data
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [colorSizes, setColorSizes] = useState<Record<string, string[]>>({})
  const [colorImageFiles, setColorImageFiles] = useState<Record<string, File[]>>({})
  const [colorImagePreviews, setColorImagePreviews] = useState<Record<string, string[]>>({})

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, image: 'Image size must be less than 5MB' })
        return
      }
      
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result as string
        setImagePreview(dataUrl)
        setErrors({ ...errors, image: '' })
      }
      reader.onerror = () => {
        setErrors({ ...errors, image: 'Failed to read image' })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleColorImagesUpload = (color: string, files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const validFiles: File[] = []
    const readers: Promise<string>[] = []
    
    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) return
      validFiles.push(file)
      
      readers.push(new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      }))
    })
    
    // Update files immediately
    setColorImageFiles((prev) => ({
      ...prev,
      [color]: [...(prev[color] || []), ...validFiles],
    }))
    
    // Update previews when all readers complete
    Promise.all(readers).then((previews) => {
      setColorImagePreviews((prev) => ({
        ...prev,
        [color]: [...(prev[color] || []), ...previews],
      }))
    }).catch(() => {
      setErrors({ ...errors, image: 'Failed to read one or more images' })
    })
  }

  const toggleColor = (e: React.MouseEvent<HTMLButtonElement>, c: string) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedColors((prev) => {
      const exists = prev.includes(c)
      return exists ? prev.filter((x) => x !== c) : [...prev, c]
    })
  }

  const toggleSize = (e: React.MouseEvent<HTMLButtonElement>, color: string, size: string) => {
    e.preventDefault()
    e.stopPropagation()
    setColorSizes((prev) => {
      const current = prev[color] || []
      const exists = current.includes(size)
      const next = exists ? current.filter((s) => s !== size) : [...current, size]
      return { ...prev, [color]: next }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsSubmitting(true)

    try {
      // Validate variant data
      if (selectedColors.length === 0) {
        setToastMessage('Select at least one colour and proceed')
        setToastType('error')
        setShowToast(true)
        setIsSubmitting(false)
        return
      }

      const missingSizes = selectedColors.filter((c) => !(colorSizes[c]?.length))
      const missingImages = selectedColors.filter((c) => !(colorImageFiles[c]?.length))

      if (missingSizes.length > 0 || missingImages.length > 0) {
        const sizeMsg = missingSizes.length ? `sizes for ${missingSizes.join(', ')}` : ''
        const imgMsg = missingImages.length ? `images for ${missingImages.join(', ')}` : ''
        const combined = [sizeMsg, imgMsg].filter(Boolean).join(' and ')
        setToastMessage(`Please add ${combined} before submitting.`)
        setToastType('error')
        setShowToast(true)
        setIsSubmitting(false)
        return
      }

      const priceCents = Math.round(parseFloat(formData.price) * 100)

      // Validate form data
      const validated = productSchema.parse({
        title: formData.title,
        priceCents,
        category: formData.category,
        subcategory: formData.subcategory || undefined,
        inStock: formData.inStock,
      })

      // Ensure a main image exists
      if (!imageFile) {
        setErrors({ image: 'Main product image is required' })
        setIsSubmitting(false)
        return
      }

      const variantPayload = selectedColors.map((color) => ({
        color,
        sizes: colorSizes[color] || [],
        images: colorImageFiles[color] || [],
      }))

      // Get category and subcategory IDs
      const categoryId = await getCategoryIdBySlug(validated.category)
      if (!categoryId) {
        setErrors({ category: 'Invalid category' })
        setIsSubmitting(false)
        return
      }

      let subcategoryId: string | null = null
      if (validated.subcategory) {
        subcategoryId = await getOrCreateSubcategoryId(validated.subcategory, categoryId)
      }

      // Generate unique slug
      const slug = generateUniqueSlug(validated.title)

      // Prepare tags array with product type if selected
      const tags: string[] = []
      if (formData.productType) {
        tags.push(formData.productType === 'upper-wear' ? 'Upper Wear' : 'Bottom Wear')
      }

      // Create product in Supabase
      await createProduct({
        title: validated.title,
        slug,
        description: undefined,
        price_cents: priceCents,
        category_id: categoryId,
        subcategory_id: subcategoryId || undefined,
        in_stock: validated.inStock,
        images: [imageFile],
        variants: variantPayload,
        tags: tags.length > 0 ? tags : undefined,
      })

      setToastMessage('Product added successfully!')
      setToastType('success')
      setShowToast(true)
      setShowModal(false)
      setStep(1)
      setFormData({
        title: '',
        price: '',
        category: category,
        subcategory: subcategory || '',
        image: '',
        inStock: true,
        productType: '' as 'upper-wear' | 'bottom-wear' | '',
      })
      setImagePreview('')
      setImageFile(null)
      setSelectedColors([])
      setColorSizes({})
      setColorImageFiles({})
      setColorImagePreviews({})

      // Refresh the page to show new product
      router.refresh()
    } catch (error) {
      console.error('Error creating product:', error)
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        setToastMessage(error instanceof Error ? error.message : 'Failed to create product')
        setToastType('error')
        setShowToast(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Focus trap
  useEffect(() => {
    if (showModal && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }

      document.addEventListener('keydown', handleTab)
      firstElement?.focus()

      return () => document.removeEventListener('keydown', handleTab)
    }
  }, [showModal])

  // Close on ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showModal])

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setShowModal(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="group bg-base rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-primary transition-all duration-300 h-full flex flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Add new product"
      >
        <div className="relative aspect-[4/5] w-full bg-gray-100 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/80 border-2 border-dashed border-gray-300 group-hover:border-primary transition-colors flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-500 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>
        <div className="flex-1 p-4 md:p-6 flex flex-col gap-2">
          <span className="text-base font-semibold text-gray-800 group-hover:text-primary transition-colors">
            Add Product
          </span>
          <p className="text-sm text-gray-600">
            Create a new item for the catalog. Choose variants, images, stock and more.
          </p>
          <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
            Add new product
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </motion.button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              ref={modalRef}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-base rounded-lg shadow-xl p-6 max-w-2xl w-full my-8"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-product-title"
            >
              <h2 id="add-product-title" className="text-2xl font-bold text-gray-900 mb-6">
                Add New Product
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="overflow-hidden">
                  <AnimatePresence initial={false} mode="wait">
                    {step === 1 ? (
                      <motion.div
                        key="form-step-1"
                        className="space-y-6"
                        initial={{ y: 24, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -24, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="md:col-span-2">
                            <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                              Title *
                            </label>
                            <input
                              id="title"
                              type="text"
                              value={formData.title}
                              onChange={(e) => {
                                setFormData({ ...formData, title: e.target.value })
                                setErrors({ ...errors, title: '' })
                              }}
                              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                              aria-invalid={!!errors.title}
                              aria-describedby={errors.title ? 'title-error' : undefined}
                            />
                            {errors.title && (
                              <p id="title-error" className="mt-1 text-sm text-red-600">
                                {errors.title}
                              </p>
                            )}
                          </div>

                          <div>
                            <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-2">
                              Price (₹) *
                            </label>
                            <input
                              id="price"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.price}
                              onChange={(e) => {
                                setFormData({ ...formData, price: e.target.value })
                                setErrors({ ...errors, priceCents: '' })
                              }}
                              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${errors.priceCents ? 'border-red-500' : 'border-gray-300'}`}
                              aria-invalid={!!errors.priceCents}
                              aria-describedby={errors.priceCents ? 'price-error' : undefined}
                            />
                            {errors.priceCents && (
                              <p id="price-error" className="mt-1 text-sm text-red-600">
                                {errors.priceCents}
                              </p>
                            )}
                          </div>

                          <div>
                            <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
                              Category *
                            </label>
                            <select
                              id="category"
                              value={formData.category}
                              onChange={(e) => {
                                setFormData({ ...formData, category: e.target.value })
                                setErrors({ ...errors, category: '' })
                              }}
                              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${errors.category ? 'border-red-500' : 'border-gray-300'}`}
                              aria-invalid={!!errors.category}
                            >
                              <option value="best-seller">Best Seller</option>
                              <option value="mens">Mens</option>
                              <option value="womens">Womens</option>
                              <option value="thrift">Thrift</option>
                              <option value="footwear">Footwear</option>
                              <option value="accessories">Accessories</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor="productType" className="block text-sm font-semibold text-gray-700 mb-2">
                              Product Type
                            </label>
                            <select
                              id="productType"
                              value={formData.productType}
                              onChange={(e) => {
                                setFormData({ ...formData, productType: e.target.value as 'upper-wear' | 'bottom-wear' | '' })
                              }}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                              <option value="">Select Product Type</option>
                              <option value="upper-wear">Upper Wear</option>
                              <option value="bottom-wear">Bottom Wear</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                              Optional: Classify the product as upper or bottom wear
                            </p>
                          </div>

                          <div className="md:col-span-2">
                            <label htmlFor="subcategory" className="block text-sm font-semibold text-gray-700 mb-2">
                              Sub-category (optional)
                            </label>
                            <input
                              id="subcategory"
                              type="text"
                              value={formData.subcategory}
                              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                              placeholder="e.g., mens-jacket, womens-shirts (use category slug format)"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Use the exact subcategory slug from your database (e.g., mens-jacket, womens-shirts)
                            </p>
                          </div>
                          
                          <div className="md:col-span-2">
                            <label htmlFor="mainImage" className="block text-sm font-semibold text-gray-700 mb-2">
                              Main Product Image *
                            </label>
                            <input
                              id="mainImage"
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              ref={fileInputRef}
                            />
                            <label
                              htmlFor="mainImage"
                              className="inline-block px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer text-sm"
                            >
                              Choose Main Image
                            </label>
                            {imagePreview && (
                              <div className="mt-3 relative w-32 h-32 border rounded overflow-hidden">
                                <Image src={imagePreview} alt="Preview" fill className="object-cover" sizes="128px" />
                              </div>
                            )}
                            {errors.image && (
                              <p className="mt-1 text-sm text-red-600">{errors.image}</p>
                            )}
                          </div>

                          <div className="md:col-span-2">
                            <p className="block text-sm font-semibold text-gray-700 mb-2">Available Colours</p>
                            <div className="flex flex-wrap gap-2">
                              {availableColors.map((c) => {
                                const selected = selectedColors.includes(c)
                                return (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={(e) => toggleColor(e, c)}
                                    className={`px-3 py-1 rounded-full border text-sm transition-colors capitalize ${selected ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                  >
                                    {c}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          <div className="md:col-span-2 flex items-center gap-3">
                            <input
                              id="inStock"
                              type="checkbox"
                              checked={formData.inStock}
                              onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                            />
                            <label htmlFor="inStock" className="text-sm font-semibold text-gray-700">
                              In Stock
                            </label>
                          </div>
                          
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-600">
                              <strong>Note:</strong> You can add additional images for color variants in the next step.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="form-step-2"
                        className="space-y-6"
                        initial={{ y: 24, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -24, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        {selectedColors.length === 0 ? (
                          <p className="text-sm text-gray-500">Go back and select at least one colour.</p>
                        ) : (
                          <div className="space-y-4">
                            {selectedColors.map((c) => (
                              <div key={c} className="rounded-lg border border-gray-200 p-4">
                                <p className="font-semibold mb-3 capitalize">{c}</p>
                                <div className="mb-4">
                                  <p className="text-sm font-semibold text-gray-700 mb-2">Sizes</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {sizeOptions.map((s) => {
                                      const selected = (colorSizes[c] || []).includes(s)
                                      return (
                                        <button
                                          key={s}
                                          type="button"
                                          onClick={(e) => toggleSize(e, c, s)}
                                          className={`w-10 h-10 rounded-full border text-sm font-semibold transition-colors ${selected ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                        >
                                          {s}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>

                                <div>
                                  <p className="text-sm font-semibold text-gray-700 mb-2 capitalize">Add images for {c}</p>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => handleColorImagesUpload(c, e.target.files)}
                                    className="hidden"
                                    id={`file-${c}`}
                                  />
                                  <label
                                    htmlFor={`file-${c}`}
                                    className="inline-block px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer text-sm"
                                  >
                                    Choose Images
                                  </label>
                                  {!!(colorImagePreviews[c]?.length) && (
                                    <div className="mt-3 grid grid-cols-4 gap-2">
                                      {colorImagePreviews[c].map((img, idx) => (
                                        <div key={idx} className="relative w-full h-20 border rounded overflow-hidden">
                                          <Image src={img} alt={`${c}-${idx}`} fill className="object-cover" sizes="100px" />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 1) {
                        setShowModal(false)
                      } else {
                        setStep(1)
                      }
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                  >
                    {step === 1 ? 'Cancel' : 'Back'}
                  </button>
                  {step === 1 ? (
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={selectedColors.length === 0}
                      className={`px-4 py-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 font-semibold ${selectedColors.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary text-white hover:bg-neutral-800'}`}
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`px-4 py-2 bg-primary text-white hover:bg-neutral-800 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 font-semibold ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? 'Adding...' : 'Add Product'}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </>
  )
}

