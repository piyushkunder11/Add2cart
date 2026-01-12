import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface SettingsState {
  storeName: string
  contactEmail: string
  contactPhone: string
  primaryColor: string
  aboutText1: string
  aboutText2: string
  setStoreName: (name: string) => void
  setContactEmail: (email: string) => void
  setContactPhone: (phone: string) => void
  setPrimaryColor: (color: string) => void
  setAboutText1: (text: string) => void
  setAboutText2: (text: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      storeName: 'Add2Cart',
      contactEmail: 'add2cart.ind@gmail.com',
      contactPhone: '+91 96916 66180',
      primaryColor: '#000000',
      aboutText1: 'At Add2Cart, we redefine affordable fashion with a curated mix of thrifted and new apparel. Our goal is to make sustainable style accessible to everyone—offering premium quality, trending streetwear, and timeless classics at honest prices.',
      aboutText2: "We believe every piece has a story—and we're here to help you wear yours with confidence.",
      setStoreName: (name: string) => set({ storeName: name }),
      setContactEmail: (email: string) => set({ contactEmail: email }),
      setContactPhone: (phone: string) => set({ contactPhone: phone }),
      setPrimaryColor: (color: string) => set({ primaryColor: color }),
      setAboutText1: (text: string) => set({ aboutText1: text }),
      setAboutText2: (text: string) => set({ aboutText2: text }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

