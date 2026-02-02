'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/store/auth'
import { formatINR } from '@/lib/utils/money'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

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
  email: string
  phone: string | null
  address_json: any
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
  status_history: any[]
  tracking_number: string | null
  shipping_provider: string | null
  created_at: string
  updated_at: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-gray-100 text-gray-800',
}

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
}

export default function OrderHistoryPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Build query params - prefer user_id if available, fallback to email
      const params = new URLSearchParams()
      if (user.id) {
        params.set('user_id', user.id)
      }
      if (user.email) {
        params.set('email', user.email)
      }

      const response = await fetch(`/api/orders?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch orders')
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Order History] Fetched orders:', {
          count: data.orders?.length || 0,
          userEmail: user?.email,
          userId: user?.id,
        })
      }
      
      setOrders(data.orders || [])
    } catch (err) {
      console.error('[Order History] Error fetching orders:', {
        error: err,
        userEmail: user?.email,
        userId: user?.id,
      })
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated || !user?.email) {
      router.push('/login')
      return
    }

    fetchOrders()

    // Auto-refresh orders every 15 seconds to see latest status updates
    const refreshInterval = setInterval(() => {
      fetchOrders()
    }, 15000) // 15 seconds

    return () => clearInterval(refreshInterval)
  }, [isAuthenticated, user, authLoading, router, fetchOrders])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#E0E0E0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your orders...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#E0E0E0]">
        <div className="container mx-auto px-4 pt-4 pb-8 md:pt-6 md:pb-12">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded inline-block mb-4"
              >
                ← Back to Home
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Order History</h1>
              <p className="text-gray-600 mt-2">View all your past orders</p>
            </div>
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 self-start sm:self-auto"
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
              <p className="text-gray-500 text-sm mb-6">Start shopping to see your orders here</p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors"
              >
                Start Shopping
              </Link>
            </div>
          )}

          {!error && orders.length > 0 && (
            <div className="space-y-6">
              {orders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-2xl border border-gray-200 p-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">
                        Order #{order.order_number || order.id.slice(-8)}
                      </h2>
                      <p className="text-sm text-gray-600">
                        Placed on{' '}
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
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
                      <span className="text-xl font-bold text-gray-900">
                        {formatINR(order.total_cents / 100)}
                      </span>
                    </div>
                  </div>

                  {order.address_json && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Delivery Address</p>
                      <p className="text-sm text-gray-600">
                        {order.address_json.fullName}
                        <br />
                        {order.address_json.flat}, {order.address_json.street}
                        <br />
                        {order.address_json.city} - {order.address_json.pincode}
                        {order.address_json.landmark && (
                          <>
                            <br />
                            Near {order.address_json.landmark}
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                    <div className="space-y-3">
                      {order.items_json.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center gap-4">
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.title}
                                fill
                                className="object-cover"
                                sizes="80px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{item.title}</p>
                            {item.variant && (
                              <p className="text-sm text-gray-500">Variant: {item.variant}</p>
                            )}
                            <p className="text-sm text-gray-600">
                              Qty: {item.quantity} × {formatINR(item.price)}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {formatINR((item.price * item.quantity))}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap justify-between gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-semibold text-gray-900">
                          {formatINR(order.subtotal_cents / 100)}
                        </span>
                      </div>
                      {order.shipping_cents > 0 && (
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">Shipping:</span>
                          <span className="font-semibold text-gray-900">
                            {formatINR(order.shipping_cents / 100)}
                          </span>
                        </div>
                      )}
                      {order.tax_cents > 0 && (
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">Tax:</span>
                          <span className="font-semibold text-gray-900">
                            {formatINR(order.tax_cents / 100)}
                          </span>
                        </div>
                      )}
                      {order.discount_cents > 0 && (
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">Discount:</span>
                          <span className="font-semibold text-green-600">
                            -{formatINR(order.discount_cents / 100)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between gap-4 font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatINR(order.total_cents / 100)}</span>
                    </div>
                  </div>

                  {order.tracking_number && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Tracking Number:</span> {order.tracking_number}
                      </p>
                      {order.shipping_provider && (
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Shipping Provider:</span> {order.shipping_provider}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Order Status History Timeline */}
                  {order.status_history && Array.isArray(order.status_history) && order.status_history.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-4">Order Status Updates</h3>
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                        
                        <div className="space-y-4">
                          {order.status_history
                            .slice()
                            .reverse()
                            .map((historyItem: any, historyIndex: number) => {
                              const isLatest = historyIndex === 0
                              const statusColor = statusColors[historyItem.status] || 'bg-gray-100 text-gray-800'
                              
                              return (
                                <div key={historyIndex} className="relative flex items-start gap-4">
                                  {/* Timeline dot */}
                                  <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                    isLatest ? 'bg-gray-900 ring-4 ring-gray-900/20' : 'bg-gray-300'
                                  }`}>
                                    <div className={`w-3 h-3 rounded-full ${
                                      isLatest ? 'bg-white' : 'bg-gray-600'
                                    }`}></div>
                                  </div>
                                  
                                  {/* Content */}
                                  <div className="flex-1 pb-4">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                                        {historyItem.status.charAt(0).toUpperCase() + historyItem.status.slice(1)}
                                      </span>
                                      {isLatest && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                    {historyItem.note && (
                                      <p className="text-sm text-gray-600 mb-1">{historyItem.note}</p>
                                    )}
                                    {historyItem.timestamp && (
                                      <p className="text-xs text-gray-500">
                                        {new Date(historyItem.timestamp).toLocaleDateString('en-IN', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      href={`/order-success?id=${order.id}`}
                      className="text-sm text-black font-semibold hover:underline"
                    >
                      View Order Details →
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
  )
}

