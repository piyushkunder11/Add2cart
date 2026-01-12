import { supabase } from './client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Order {
  id: string
  order_number: string
  user_id: string | null
  email: string
  phone: string | null
  address_json: {
    fullName: string
    phone: string
    email: string
    pincode: string
    flat: string
    street: string
    landmark?: string
    city: string
  }
  items_json: Array<{
    id: string
    title: string
    price: number
    quantity: number
    image: string
    variant?: string | null
  }>
  subtotal_cents: number
  shipping_cents: number
  tax_cents: number
  discount_cents: number
  total_cents: number
  payment_method: string | null
  payment_status: string
  payment_id: string | null
  payment_date: string | null
  status: string
  status_history: Array<{
    status: string
    timestamp: string
    note: string
  }>
  tracking_number: string | null
  shipping_provider: string | null
  shipped_at: string | null
  delivered_at: string | null
  customer_notes: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

// Realtime subscription (singleton)
let ordersChannel: RealtimeChannel | null = null
const orderSubscribers = new Set<() => void>()

function handleRealtimeEvent(eventType: string, table: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Orders Realtime] ${eventType} on ${table}`)
  }
  orderSubscribers.forEach((cb) => cb())
}

export function subscribeToOrdersRealtime(onChange: () => void): () => void {
  orderSubscribers.add(onChange)

  if (!ordersChannel) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Orders Realtime] Creating singleton channel for orders')
    }
    ordersChannel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[Orders Realtime] Order changed:', payload.eventType)
          }
          handleRealtimeEvent(payload.eventType, 'orders')
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[Orders Realtime] Successfully subscribed to orders')
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Orders Realtime] Channel error')
        } else if (status === 'TIMED_OUT') {
          console.error('[Orders Realtime] Subscription timed out')
        } else if (status === 'CLOSED') {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[Orders Realtime] Channel closed')
          }
        }
      })
  } else {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Orders Realtime] Reusing existing channel (subscribers:', orderSubscribers.size, ')')
    }
  }

  return () => {
    orderSubscribers.delete(onChange)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Orders Realtime] Unsubscribed (remaining:', orderSubscribers.size, ')')
    }
    if (orderSubscribers.size === 0 && ordersChannel) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Orders Realtime] No subscribers left, removing channel')
      }
      supabase.removeChannel(ordersChannel)
      ordersChannel = null
    }
  }
}

/**
 * Fetch all orders from Supabase with optional filters
 */
export async function fetchOrdersFromSupabase(
  filters?: {
    status?: string
    payment_status?: string
  }
): Promise<Order[]> {
  try {
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.payment_status) {
      query = query.eq('payment_status', filters.payment_status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching orders from Supabase:', error)
      return []
    }

    return (data as Order[]) || []
  } catch (error) {
    console.error('Error in fetchOrdersFromSupabase:', error)
    return []
  }
}

/**
 * Fetch a single order by ID
 */
export async function fetchOrderById(id: string): Promise<Order | null> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return null
    }

    return data as Order
  } catch (error) {
    console.error('Error in fetchOrderById:', error)
    return null
  }
}

/**
 * Update an order
 */
export async function updateOrder(
  id: string,
  updates: {
    status?: string
    tracking_number?: string
    shipping_provider?: string
    admin_notes?: string
  }
): Promise<Order | null> {
  try {
    // Get current order to update status_history
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('status_history, status')
      .eq('id', id)
      .single()

    const statusHistory = currentOrder?.status_history || []
    
    // Add status change to history if status is being updated
    if (updates.status && updates.status !== currentOrder?.status) {
      statusHistory.push({
        status: updates.status,
        timestamp: new Date().toISOString(),
        note: `Status updated to ${updates.status}`,
      })
    }

    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    if (updates.status) {
      updateData.status_history = statusHistory
      
      // Set shipped_at if status is shipped
      if (updates.status === 'shipped' && !currentOrder?.status_history?.some((h: any) => h.status === 'shipped')) {
        updateData.shipped_at = new Date().toISOString()
      }
      
      // Set delivered_at if status is delivered
      if (updates.status === 'delivered' && !currentOrder?.status_history?.some((h: any) => h.status === 'delivered')) {
        updateData.delivered_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      console.error('Error updating order:', error)
      return null
    }

    return data as Order
  } catch (error) {
    console.error('Error in updateOrder:', error)
    return null
  }
}

