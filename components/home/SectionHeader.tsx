'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

interface SectionHeaderProps {
  title: string
  href?: string
  viewAllText?: string
  category?: string
}

export default function SectionHeader({ title, href = '#', viewAllText = 'View All', category }: SectionHeaderProps) {
  // Generate href based on category
  const getHref = () => {
    if (category === 'best-seller') {
      return '/best-seller'
    }
    if (category === 'mens') {
      return '/mens'
    }
    if (category === 'womens') {
      return '/womens'
    }
    if (category === 'thrift') {
      return '/thrift'
    }
    return href
  }
  
  // Don't show "View All" if href is '#' (no link)
  const showViewAll = href !== '#' && (href || category)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-between mb-6"
    >
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 relative inline-block">
        {title}
        <motion.span
          className="absolute bottom-0 left-0 h-0.5 bg-primary"
          initial={{ width: 0 }}
          whileInView={{ width: '40%' }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
      </h2>
      {showViewAll && (
        <Link
          href={getHref()}
          className="text-sm font-semibold text-black hover:text-neutral-700 underline-offset-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
        >
          {viewAllText} →
        </Link>
      )}
    </motion.div>
  )
}

