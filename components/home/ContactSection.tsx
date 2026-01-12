'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import SectionHeader from './SectionHeader'
import { useSettingsStore } from '@/lib/store/settings'
import { useIsAdmin } from '@/lib/auth/useIsAdmin'

export default function ContactSection() {
  const contactEmail = useSettingsStore((state) => state.contactEmail)
  const contactPhone = useSettingsStore((state) => state.contactPhone)
  const setContactEmail = useSettingsStore((state) => state.setContactEmail)
  const setContactPhone = useSettingsStore((state) => state.setContactPhone)
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin()
  const [isEditing, setIsEditing] = useState(false)
  const [editEmail, setEditEmail] = useState(contactEmail)
  const [editPhone, setEditPhone] = useState(contactPhone)

  const handleSave = () => {
    setContactEmail(editEmail)
    setContactPhone(editPhone)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditEmail(contactEmail)
    setEditPhone(contactPhone)
    setIsEditing(false)
  }

  return (
    <section id="contact" className="container mx-auto px-4 py-16 md:py-24 bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <SectionHeader title="Contact" href="#" />
        {!isAdminLoading && isAdmin && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm font-semibold text-black hover:text-neutral-700 underline-offset-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-3 py-1"
          >
            Edit
          </button>
        )}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl space-y-6"
      >
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary text-white hover:bg-neutral-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 font-semibold"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone</h3>
                <a
                  href={`tel:${contactPhone.replace(/\s/g, '')}`}
                  className="text-xl font-semibold text-gray-900 hover:text-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  {contactPhone}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</h3>
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-xl font-semibold text-gray-900 hover:text-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  {contactEmail}
                </a>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </section>
  )
}

