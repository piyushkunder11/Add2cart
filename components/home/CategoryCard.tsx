'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useIsAdmin } from '@/lib/auth/useIsAdmin'
import CategoryKebabMenu from '@/components/admin/CategoryKebabMenu'
import type { Category } from '@/lib/supabase/categories'

interface CategoryCardProps {
  category: Category
  href: string
  onImageChange?: (categoryId: string, newImageUrl: string) => void
}

export default function CategoryCard({ category, href, onImageChange }: CategoryCardProps) {
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin()
  const imageUrl = category.image_url || 'https://via.placeholder.com/400x500?text=Category'
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [imageKey, setImageKey] = useState(0)

  const handleModalStateChange = (isOpen: boolean) => {
    setIsModalOpen(isOpen)
    if (!isOpen) {
      // Force image refresh when modal closes (after upload)
      setImageKey(prev => prev + 1)
    }
  }

  return (
    <div className="relative">
      {isModalOpen ? (
        <motion.div
          variants={{}}
          className="bg-base rounded-lg overflow-hidden border border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-300 cursor-pointer relative"
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
            <Image
              key={`${category.id}-${imageKey}-${category.image_url || ''}`}
              src={imageUrl}
              alt={category.name}
              fill
              unoptimized={category.image_url?.includes('supabase')}
              className="object-cover hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, 33vw"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = 'https://via.placeholder.com/400x500?text=Category'
              }}
            />
            {!isAdminLoading && isAdmin && (
              <div
                className="absolute top-0 right-0 z-10"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                role="presentation"
              >
                <CategoryKebabMenu
                  categoryId={category.id}
                  categoryName={category.name}
                  onImageChange={onImageChange ?? ((_id: string, _url: string) => {})}
                  onModalStateChange={handleModalStateChange}
                />
              </div>
            )}
          </div>
          <div className="p-4 md:p-6">
            <h3 className="font-semibold text-gray-900 mb-2 text-lg">{category.name}</h3>
            <p className="text-sm text-gray-600 mb-4">Explore our collection</p>
          </div>
        </motion.div>
      ) : (
        <Link href={href} className="block">
          <motion.div
            variants={{}}
            className="bg-base rounded-lg overflow-hidden border border-gray-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-shadow duration-300 cursor-pointer relative"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
              <Image
                key={`${category.id}-${imageKey}-${category.image_url || ''}`}
                src={imageUrl}
                alt={category.name}
                fill
                unoptimized={category.image_url?.includes('supabase')}
                className="object-cover hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 33vw"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = 'https://via.placeholder.com/400x500?text=Category'
                }}
              />
              {!isAdminLoading && isAdmin && (
                <div
                  className="absolute top-0 right-0 z-10"
                  onClick={(event) => {
                    event.stopPropagation()
                    event.preventDefault()
                  }}
                  onKeyDown={(event) => {
                    event.stopPropagation()
                    event.preventDefault()
                  }}
                  role="presentation"
                >
                  <CategoryKebabMenu
                    categoryId={category.id}
                    categoryName={category.name}
                    onImageChange={onImageChange ?? ((_id: string, _url: string) => {})}
                    onModalStateChange={handleModalStateChange}
                  />
                </div>
              )}
            </div>
            <div className="p-4 md:p-6">
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">{category.name}</h3>
              <p className="text-sm text-gray-600 mb-4">Explore our collection</p>
            </div>
          </motion.div>
        </Link>
      )}
    </div>
  )
}
