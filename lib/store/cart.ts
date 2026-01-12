'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CartItem {
  id: string
  title: string
  price: number
  image: string
  qty: number
  variant?: string
}

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'qty'>) => void
  removeItem: (id: string, variant?: string) => void
  updateQuantity: (id: string, qty: number, variant?: string) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const existingItem = get().items.find(
          (i) => i.id === item.id && i.variant === item.variant
        )
        if (existingItem) {
          set({
            items: get().items.map((i) =>
              i.id === item.id && i.variant === item.variant
                ? { ...i, qty: i.qty + 1 }
                : i
            ),
          })
        } else {
          set({
            items: [...get().items, { ...item, qty: 1 }],
          })
        }
      },
      removeItem: (id: string, variant?: string) =>
        set({
          items: get().items.filter(
            (item) => !(item.id === id && item.variant === variant)
          ),
        }),
      updateQuantity: (id: string, qty: number, variant?: string) =>
        set({
          items: get().items
            .map((item) =>
              item.id === id && item.variant === variant
                ? { ...item, qty: Math.max(0, qty) }
                : item
            )
            .filter((item) => item.qty > 0),
        }),
      clearCart: () => set({ items: [] }),
      getTotalItems: () => get().items.reduce((sum, item) => sum + item.qty, 0),
      getTotalPrice: () =>
        get().items.reduce((sum, item) => sum + item.price * item.qty, 0),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : ({
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      } as unknown as Storage))),
    }
  )
)

