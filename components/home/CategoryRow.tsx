'use client'

import { motion } from 'framer-motion'
import ProductCard from '@/components/shop/ProductCard'
import { type Product } from '@/lib/supabase/products'
import { useIsAdmin } from '@/lib/auth/useIsAdmin'
import AddProductCard from '@/components/shop/AddProductCard'

interface CategoryRowProps {
  products: Product[]
  category: string
  subcategory?: string
}

export default function CategoryRow({ products, category, subcategory }: CategoryRowProps) {
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin()
  
  return (
    <div className="overflow-hidden">
      <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 scrollbar-hide snap-x snap-mandatory md:snap-none">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="flex-shrink-0 w-[280px] md:w-auto snap-start"
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
        {!isAdminLoading && isAdmin && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
            className="flex-shrink-0 w-[280px] md:w-auto snap-start"
          >
            <AddProductCard category={category} subcategory={subcategory} />
          </motion.div>
        )}
      </div>
    </div>
  )
}

