'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Navbar from '@/components/home/Navbar'
import { useSettingsStore } from '@/lib/store/settings'

export default function SettingsPage() {
  const storeName = useSettingsStore((state) => state.storeName)
  const contactEmail = useSettingsStore((state) => state.contactEmail)
  const contactPhone = useSettingsStore((state) => state.contactPhone)
  const primaryColor = useSettingsStore((state) => state.primaryColor)
  const setStoreName = useSettingsStore((state) => state.setStoreName)
  const setContactEmail = useSettingsStore((state) => state.setContactEmail)
  const setContactPhone = useSettingsStore((state) => state.setContactPhone)
  const setPrimaryColor = useSettingsStore((state) => state.setPrimaryColor)

  const [showToast, setShowToast] = useState(false)

  const handleSave = () => {
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-base pt-20">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
          <div className="mb-8">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded inline-block mb-4"
            >
              ← Back to Home
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Settings</h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-base rounded-lg border border-gray-200 p-6 md:p-8 space-y-6"
          >
            <div>
              <label htmlFor="storeName" className="block text-sm font-semibold text-gray-700 mb-2">
                Store Name
              </label>
              <input
                id="storeName"
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-semibold text-gray-700 mb-2">
                Contact Email
              </label>
              <input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
            </div>

            <div>
              <label htmlFor="contactPhone" className="block text-sm font-semibold text-gray-700 mb-2">
                Contact Phone
              </label>
              <input
                id="contactPhone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
            </div>

            <div>
              <label htmlFor="primaryColor" className="block text-sm font-semibold text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-16 border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 font-mono text-sm"
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                className="w-full md:w-auto px-6 py-3 bg-primary text-white hover:bg-neutral-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 font-semibold"
              >
                Save Settings
              </button>
            </div>
          </motion.div>

          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-4 right-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg"
            >
              Settings saved successfully!
            </motion.div>
          )}
        </div>
      </div>
    </>
  )
}

