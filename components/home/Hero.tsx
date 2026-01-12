'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { smoothScrollTo } from '@/lib/scroll'

export default function Hero() {
  return (
    <section className="relative min-h-[60vh] md:min-h-[70vh] flex items-center justify-center px-4 py-16 md:py-24 overflow-hidden">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 -left-20 w-96 h-96 bg-black/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-20 -right-20 w-96 h-96 bg-black/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="container mx-auto max-w-4xl text-center relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6"
        >
          Fresh Fits <span className="text-primary">+ Thrifted Fits</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto"
        >
          Premium new drops + handpicked pre-loved peices.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link
            href="#best-seller"
            onClick={(e) => {
              e.preventDefault()
              smoothScrollTo('best-seller', 80)
            }}
            className="relative px-8 py-4 bg-primary text-white hover:bg-neutral-800 active:bg-neutral-900 font-semibold rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 overflow-hidden group"
          >
            <span className="relative z-10">Shop New Arrivals</span>
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
              initial={false}
            />
          </Link>
          <Link
            href="#thrift"
            onClick={(e) => {
              e.preventDefault()
              smoothScrollTo('thrift', 80)
            }}
            className="px-8 py-4 border-2 border-black text-black hover:bg-black hover:text-white font-semibold rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Explore Collections
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

