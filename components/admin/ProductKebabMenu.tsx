'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { updateProduct, deleteProduct } from '@/lib/supabase/admin'

interface ProductKebabMenuProps {
  productId: string
  productTitle: string
  isInStock: boolean
  onToggleStock?: () => void
  onRemove?: (productId: string) => void
  onRemoveError?: (message: string) => void
}

export default function ProductKebabMenu({
  productId,
  productTitle,
  isInStock,
  onToggleStock,
  onRemove,
  onRemoveError,
}: ProductKebabMenuProps) {
  const router = useRouter()
  const [showKebabMenu, setShowKebabMenu] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
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

  const handleToggleStock = async () => {
    setIsUpdating(true)
    try {
      await updateProduct(productId, { in_stock: !isInStock })
      
      // Call callback if provided
      if (onToggleStock) {
        onToggleStock()
      }
      
      // Refresh page to show updated data
      router.refresh()
    } catch (error) {
      console.error('Error updating product stock:', error)
      alert('Failed to update product stock. Please try again.')
    } finally {
      setIsUpdating(false)
      setShowKebabMenu(false)
    }
  }

  const handleRemove = async () => {
    setIsDeleting(true)
    try {
      await deleteProduct(productId)
      
      // Call callback if provided
      onRemove?.(productId)
      
      // Refresh page to show updated data
      router.refresh()
    } catch (error) {
      console.error('Error deleting product:', error)
      onRemoveError?.('Failed to delete product. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowConfirmModal(false)
      setShowKebabMenu(false)
    }
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
          aria-label="Manage product"
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
                  handleToggleStock()
                }}
                disabled={isUpdating}
                className={`w-full text-left px-4 py-2 text-gray-900 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset text-sm ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="menuitem"
              >
                {isUpdating ? 'Updating...' : (isInStock ? 'Mark Out of Stock' : 'Mark In Stock')}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  setShowConfirmModal(true)
                  setShowKebabMenu(false)
                }}
                className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-inset text-sm"
                role="menuitem"
              >
                Remove Product
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirm Remove Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowConfirmModal(false)
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-base rounded-lg shadow-xl p-6 max-w-md w-full"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
            >
              <h3 id="confirm-title" className="text-xl font-bold text-gray-900 mb-4">
                Remove Product?
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to remove &quot;{productTitle}&quot;? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowConfirmModal(false)
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleRemove()
                  }}
                  disabled={isDeleting}
                  className={`px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isDeleting ? 'Deleting...' : 'Remove'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

