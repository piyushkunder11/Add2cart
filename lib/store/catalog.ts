'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import localforage from 'localforage'

export type ColorVariant = {
  id?: string
  color: string
  sizes: string[]
  images: string[]
}

export type Product = {
  id: string
  title: string
  priceCents: number
  category: string
  subcategory?: string
  inStock: boolean
  image: string
  description?: string
  tags?: string[]
  variants?: ColorVariant[]
  createdAt: number
  updatedAt: number
}

interface CatalogState {
  products: Product[]
  listBy: (category: string, subcategory?: string) => Product[]
  add: (p: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product
  update: (id: string, patch: Partial<Product>) => Product | null
  upsert: (id: string, p: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product
  remove: (id: string) => void
  initializeFromJSON: (products: Array<Omit<Product, 'createdAt' | 'updatedAt' | 'inStock'> & { price: number }>) => void
}

// BroadcastChannel for cross-tab sync
const channelName = 'catalog-sync'
let broadcastChannel: BroadcastChannel | null = null

if (typeof window !== 'undefined') {
  broadcastChannel = new BroadcastChannel(channelName)
}

const broadcast = (type: string, payload: any) => {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type, payload, timestamp: Date.now() })
  }
}

// Storage adapter for localForage
const localForageStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await localforage.getItem<string>(name)
    return value
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await localforage.setItem(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    await localforage.removeItem(name)
  },
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set, get) => {
      // Listen to broadcast messages
      if (broadcastChannel) {
        broadcastChannel.onmessage = (event) => {
          const { type, payload } = event.data
          if (type === 'products-updated') {
            set({ products: payload })
          }
        }
      }

      return {
        products: [],
        listBy: (category: string, subcategory?: string) => {
          const products = get().products
          return products.filter((p) => {
            const categoryMatch = p.category === category
            const subcategoryMatch = subcategory ? p.subcategory === subcategory : true
            return categoryMatch && subcategoryMatch
          })
        },
        add: (p: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
          const now = Date.now()
          const newProduct: Product = {
            ...p,
            id: `prod-${now}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: now,
            updatedAt: now,
          }
          set((state) => {
            const newProducts = [...state.products, newProduct]
            broadcast('products-updated', newProducts)
            return { products: newProducts }
          })
          return newProduct
        },
        update: (id: string, patch: Partial<Product>) => {
          let updated: Product | null = null
          set((state) => {
            const newProducts = state.products.map((p) => {
              if (p.id === id) {
                updated = { ...p, ...patch, updatedAt: Date.now() }
                return updated
              }
              return p
            })
            broadcast('products-updated', newProducts)
            return { products: newProducts }
          })
          return updated
        },
        upsert: (id: string, p: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
          const now = Date.now()
          let result: Product
          set((state) => {
            const existing = state.products.find(prod => prod.id === id)
            if (existing) {
              // Update existing
              result = { ...existing, ...p, updatedAt: now }
              const newProducts = state.products.map(prod =>
                prod.id === id ? result : prod
              )
              broadcast('products-updated', newProducts)
              return { products: newProducts }
            } else {
              // Add new with specified ID
              result = {
                ...p,
                id,
                createdAt: now,
                updatedAt: now,
              }
              const newProducts = [...state.products, result]
              broadcast('products-updated', newProducts)
              return { products: newProducts }
            }
          })
          return result!
        },
        remove: (id: string) => {
          set((state) => {
            const newProducts = state.products.filter((p) => p.id !== id)
            broadcast('products-updated', newProducts)
            return { products: newProducts }
          })
        },
        initializeFromJSON: (products: Array<Omit<Product, 'createdAt' | 'updatedAt' | 'inStock'> & { price: number }>) => {
          const now = Date.now()
          const convertedProducts: Product[] = products.map((p) => ({
            id: p.id,
            title: p.title,
            priceCents: p.price * 100,
            category: p.category,
            subcategory: undefined,
            inStock: true,
            image: p.image,
            createdAt: now,
            updatedAt: now,
          }))
          set((state) => {
            if (state.products.length === 0) {
              broadcast('products-updated', convertedProducts)
              return { products: convertedProducts }
            }
            return state
          })
        },
      }
    },
    {
      name: 'catalog-storage',
      storage: createJSONStorage(() => localForageStorage),
    }
  )
)

// Catalog store is now only used for client-side state management
// All product data comes from Supabase

