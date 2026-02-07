'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CategoryKebabMenuProps {
  categoryId: string
  categoryName: string
  onImageChange: (categoryId: string, newImageUrl: string) => void
  onModalStateChange?: (isOpen: boolean) => void
}

export default function CategoryKebabMenu({
  categoryId,
  categoryName,
  onImageChange,
  onModalStateChange,
}: CategoryKebabMenuProps) {
  const [showKebabMenu, setShowKebabMenu] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const kebabMenuRef = useRef<HTMLDivElement>(null)
  const kebabButtonRef = useRef<HTMLButtonElement>(null)

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        kebabMenuRef.current &&
        !kebabMenuRef.current.contains(event.target as Node) &&
        kebabButtonRef.current &&
        !kebabButtonRef.current.contains(event.target as Node)
      ) {
        setShowKebabMenu(false)
      }
    }

    if (showKebabMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showKebabMenu])

  // Close menu on ESC
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showKebabMenu) {
        setShowKebabMenu(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showKebabMenu])

  const handleImageChange = () => {
    setShowKebabMenu(false)
    setShowImageModal(true)
    onModalStateChange?.(true)
  }

  const handleImageUploaded = (newImageUrl: string) => {
    setShowImageModal(false)
    onModalStateChange?.(false)
    onImageChange(categoryId, newImageUrl)
  }

  const handleModalClose = () => {
    setShowImageModal(false)
    onModalStateChange?.(false)
  }

  return (
    <>
      <div
        className="absolute top-2 right-2 z-20"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button
          ref={kebabButtonRef}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setShowKebabMenu(!showKebabMenu)
          }}
          className="rounded-full bg-black/80 hover:bg-black text-white h-8 w-8 grid place-items-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          aria-label="Manage category"
          aria-haspopup="menu"
          aria-expanded={showKebabMenu}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        <AnimatePresence>
          {showKebabMenu && (
            <motion.div
              ref={kebabMenuRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-48 bg-base rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-gray-200 py-2 z-30"
              role="menu"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  handleImageChange()
                }}
                className="w-full text-left px-4 py-2 text-gray-900 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset text-sm"
                role="menuitem"
              >
                Change this image
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Image Upload Modal */}
      <AnimatePresence>
        {showImageModal && (
          <CategoryImageUploadModal
            categoryId={categoryId}
            categoryName={categoryName}
            onClose={handleModalClose}
            onSuccess={handleImageUploaded}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// Category Image Upload Modal Component
interface CategoryImageUploadModalProps {
  categoryId: string
  categoryName: string
  onClose: () => void
  onSuccess: (newImageUrl: string) => void
}

function CategoryImageUploadModal({
  categoryId,
  categoryName,
  onClose,
  onSuccess,
}: CategoryImageUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    const file = e.target.files?.[0]
    if (!file) {
      setError('No file selected')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      setSelectedFile(null)
      setPreviewUrl(null)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      setSelectedFile(null)
      setPreviewUrl(null)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.onerror = () => {
      setError('Failed to read image file')
      setSelectedFile(null)
      setPreviewUrl(null)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select an image file')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('categoryId', categoryId)

      const response = await fetch('/api/categories/upload-image', {
        method: 'POST',
        body: formData,
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Failed to upload image')
      }

      // Success - pass new image URL to parent for immediate display, then close
      const newImageUrl = responseData.imageUrl as string
      setSuccess(true)
      setTimeout(() => {
        onSuccess(newImageUrl)
      }, 800)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload image. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        className="bg-base rounded-lg shadow-xl p-6 max-w-md w-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-title"
      >
        <h3 id="upload-title" className="text-xl font-bold text-gray-900 mb-4">
          Change Image for {categoryName}
        </h3>

        <div className="space-y-4">
          {/* Preview */}
          {previewUrl && (
            <div className="relative aspect-[4/5] overflow-hidden bg-gray-100 rounded-lg">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* File Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Image
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              onClick={(e) => {
                e.stopPropagation()
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
              {selectedFile ? 'Change Image' : 'Choose Image'}
            </button>
            {selectedFile && (
              <p className="mt-2 text-xs text-gray-500">{selectedFile.name}</p>
            )}
          </div>

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">Image uploaded successfully!</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onClose()
              }}
              disabled={isUploading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleUpload()
              }}
              disabled={!selectedFile || isUploading}
              className={`px-4 py-2 bg-black text-white hover:bg-gray-900 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
                !selectedFile || isUploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
