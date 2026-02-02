'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useIsAdmin } from '@/lib/auth/useIsAdmin'
import { formatINR } from '@/lib/utils/money'
import { supabase } from '@/lib/supabase/client'

interface OrderItem {
  id: string
  title: string
  price: number
  quantity: number
  image: string
  variant?: string | null
}

interface Order {
  id: string
  order_number: string
  user_id: string | null
  email: string
  phone: string | null
  address_json: {
    fullName: string
    phone?: string
    email?: string
    flat: string
    street: string
    landmark?: string
    city: string
    pincode: string
    state?: string
    country?: string
  }
  items_json: OrderItem[]
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

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get access token from Supabase client to send with request
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      // Add Authorization header if we have a session
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const response = await fetch('/api/admin/orders', {
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch orders')
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setOrders(data.orders || [])
    } catch (err) {
      console.error('[Admin Orders] Error fetching orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdminLoading) return

    if (!isAdmin) {
      router.push('/')
      return
    }

    fetchOrders()

    // Auto-refresh orders every 30 seconds to get latest updates
    const refreshInterval = setInterval(() => {
      fetchOrders()
    }, 30000) // 30 seconds

    return () => clearInterval(refreshInterval)
  }, [isAdmin, isAdminLoading, router, fetchOrders])

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingOrderId(orderId)
      setUpdateError(null)

      // Get access token from Supabase client to send with request
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      // Add Authorization header if we have a session
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      console.log('[Admin Orders] Updating order status:', { orderId, newStatus })
      
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.message 
          ? `${errorData.error}: ${errorData.message}`
          : errorData.error || 'Failed to update order status'
        console.error('[Admin Orders] Update failed:', { errorData, errorMessage })
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('[Admin Orders] Update response:', { data })
      
      if (data.error) {
        console.error('[Admin Orders] Response contains error:', data.error)
        throw new Error(data.error)
      }
      
      if (!data.order) {
        console.error('[Admin Orders] Response missing order data:', data)
        throw new Error('Update succeeded but no order data returned')
      }
      
      console.log('[Admin Orders] Updating local state with order:', { orderId, status: data.order.status })
      
      // Update local state optimistically
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? data.order : order
        )
      )
    } catch (err) {
      console.error('[Admin Orders] Error updating order:', err)
      setUpdateError(err instanceof Error ? err.message : 'Failed to update status')
      
      // Refresh orders to get latest state
      fetchOrders()
    } finally {
      setUpdatingOrderId(null)
    }
  }

  if (isAdminLoading || loading) {
    return (
      <div className="min-h-screen bg-[#E0E0E0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#E0E0E0]">
      <div className="container mx-auto px-4 pt-4 pb-8 md:pt-6 md:pb-12">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Admin Orders</h1>
            <p className="text-gray-600 mt-2">Manage all customer orders (Paid or Confirmed only)</p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg
              className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {updateError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{updateError}</p>
            <button
              onClick={() => setUpdateError(null)}
              className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchOrders}
              className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
            >
              Try again
            </button>
          </div>
        )}

        {!error && orders.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <p className="text-gray-600 text-lg mb-2">No orders yet</p>
            <p className="text-gray-500 text-sm">Orders will appear here once customers start placing them</p>
          </div>
        )}

        {!error && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold text-gray-900">
                        Order #{order.order_number || order.id.slice(-8)}
                      </h2>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          statusColors[order.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          paymentStatusColors[order.payment_status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatINR(order.total_cents / 100)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.items_json.length} item{order.items_json.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Customer</p>
                    <p className="text-sm text-gray-900">{order.address_json?.fullName || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{order.email}</p>
                    {order.phone && (
                      <p className="text-sm text-gray-600">{order.phone}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Shipping Address</p>
                    <p className="text-sm text-gray-600">
                      {order.address_json?.flat}, {order.address_json?.street}
                      <br />
                      {order.address_json?.city} - {order.address_json?.pincode}
                      {order.address_json?.landmark && (
                        <>
                          <br />
                          Near {order.address_json.landmark}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Order Items</p>
                  <div className="space-y-2">
                    {order.items_json.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-3 text-sm">
                        <span className="text-gray-600 w-8">{item.quantity}x</span>
                        <span className="text-gray-900 flex-1">{item.title}</span>
                        {item.variant && (
                          <span className="text-gray-500 text-xs">({item.variant})</span>
                        )}
                        <span className="text-gray-900 font-semibold">
                          {formatINR((item.price * item.quantity))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Update Order Status
                      </label>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                        disabled={updatingOrderId === order.id}
                        className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {updatingOrderId === order.id && (
                        <span className="ml-2 text-sm text-gray-500">Saving...</span>
                      )}
                    </div>
                    {order.tracking_number && (
                      <div className="text-sm">
                        <p className="font-semibold text-gray-700">Tracking</p>
                        <p className="text-gray-600">{order.tracking_number}</p>
                        {order.shipping_provider && (
                          <p className="text-gray-500 text-xs">{order.shipping_provider}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
