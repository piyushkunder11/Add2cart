'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import SectionHeader from './SectionHeader'
import { useSettingsStore } from '@/lib/store/settings'
import { useIsAdmin } from '@/lib/auth/useIsAdmin'

export default function AboutSection() {
  const aboutText1 = useSettingsStore((state) => state.aboutText1)
  const aboutText2 = useSettingsStore((state) => state.aboutText2)
  const setAboutText1 = useSettingsStore((state) => state.setAboutText1)
  const setAboutText2 = useSettingsStore((state) => state.setAboutText2)
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin()
  const [isEditing, setIsEditing] = useState(false)
  const [editText1, setEditText1] = useState(aboutText1)
  const [editText2, setEditText2] = useState(aboutText2)

  const handleSave = () => {
    setAboutText1(editText1)
    setAboutText2(editText2)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditText1(aboutText1)
    setEditText2(aboutText2)
    setIsEditing(false)
  }

  return (
    <section id="about" className="container mx-auto px-4 py-16 md:py-24">
      <div className="flex items-center justify-between mb-6">
        <SectionHeader title="About Us — Add2Cart" href="#" />
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
        className="max-w-3xl space-y-6 text-gray-700 leading-relaxed"
      >
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                First Paragraph
              </label>
              <textarea
                value={editText1}
                onChange={(e) => setEditText1(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Second Paragraph
              </label>
              <textarea
                value={editText2}
                onChange={(e) => setEditText2(e.target.value)}
                rows={3}
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
            <p className="text-lg">{aboutText1}</p>
            <p className="text-lg">{aboutText2}</p>
          </>
        )}
      </motion.div>
    </section>
  )
}

