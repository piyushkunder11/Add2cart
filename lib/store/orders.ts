'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import localforage from 'localforage'

export type Order = {
  id: string
  customerName: string
  customerEmail: string
  items: Array<{
    productId: string
    title: string
    priceCents: number
    quantity: number
    image: string
  }>
  totalCents: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  createdAt: number
  updatedAt: number
}

interface OrdersState {
  orders: Order[]
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Order
  updateOrder: (id: string, patch: Partial<Order>) => Order | null
  getOrder: (id: string) => Order | undefined
  getAllOrders: () => Order[]
}

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

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
        const now = Date.now()
        const newOrder: Order = {
          ...order,
          id: `order-${now}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          orders: [...state.orders, newOrder],
        }))
        return newOrder
      },
      updateOrder: (id: string, patch: Partial<Order>) => {
        let updated: Order | null = null
        set((state) => {
          const newOrders = state.orders.map((o) => {
            if (o.id === id) {
              updated = { ...o, ...patch, updatedAt: Date.now() }
              return updated
            }
            return o
          })
          return { orders: newOrders }
        })
        return updated
      },
      getOrder: (id: string) => {
        return get().orders.find((o) => o.id === id)
      },
      getAllOrders: () => {
        return get().orders.sort((a, b) => b.createdAt - a.createdAt)
      },
    }),
    {
      name: 'orders-storage',
      storage: createJSONStorage(() => localForageStorage),
    }
  )
)

// Orders are now fetched from Supabase - no mock data initialization

