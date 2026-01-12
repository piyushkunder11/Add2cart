'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from '@/components/admin/Sidebar'
import Topbar from '@/components/admin/Topbar'
import { useIsAdmin } from '@/lib/auth/useIsAdmin'
import { formatINR } from '@/lib/utils/money'
import Image from 'next/image'
import Toast from '@/components/ui/Toast'
import { subscribeToOrdersRealtime } from '@/lib/supabase/orders'

interface Order {
  id: string
  order_number: string
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

const statusOptions = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
const paymentStatusOptions = ['all', 'pending', 'paid', 'failed', 'cancelled', 'refunded']

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const paymentStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  refunded: 'bg-orange-100 text-orange-800',
}

export default function AdminOrdersPage() {
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Form state for order updates
  const [updateForm, setUpdateForm] = useState({
    status: '',
    tracking_number: '',
    shipping_provider: '',
    admin_notes: '',
  })

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      if (paymentStatusFilter !== 'all') {
        params.set('payment_status', paymentStatusFilter)
      }

      const response = await fetch(`/api/admin/orders?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      const data = await response.json()
      setOrders(data.orders || [])
    } catch (error) {
      console.error('Error loading orders:', error)
      setToast({ message: 'Failed to load orders', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, paymentStatusFilter])

  useEffect(() => {
    if (!isAdminLoading && isAdmin) {
      loadOrders()
    }
  }, [isAdminLoading, isAdmin, loadOrders])

  // Realtime subscription
  useEffect(() => {
    if (!isAdminLoading && isAdmin) {
      const unsubscribe = subscribeToOrdersRealtime(() => {
        loadOrders()
      })
      return unsubscribe
    }
  }, [isAdminLoading, isAdmin, loadOrders])

  const handleOrderClick = async (order: Order) => {
    setSelectedOrder(order)
    setUpdateForm({
      status: order.status,
      tracking_number: order.tracking_number || '',
      shipping_provider: order.shipping_provider || '',
      admin_notes: order.admin_notes || '',
    })
    setShowOrderDetails(true)
  }

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return

    try {
      setIsUpdating(true)
      const response = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: updateForm.status,
          tracking_number: updateForm.tracking_number || null,
          shipping_provider: updateForm.shipping_provider || null,
          admin_notes: updateForm.admin_notes || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update order')
      }

      setToast({ message: 'Order updated successfully', type: 'success' })
      setShowOrderDetails(false)
      loadOrders()
    } catch (error) {
      console.error('Error updating order:', error)
      setToast({ message: 'Failed to update order', type: 'error' })
    } finally {
      setIsUpdating(false)
    }
  }

  // Redirect if not admin
  if (!isAdminLoading && !isAdmin) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You must be an admin to access this page.</p>
        </div>
      </div>
    )
  }

  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#E0E0E0]">
      <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:pl-64 pt-16">
        <div className="p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Orders</h1>
            <p className="text-gray-600">Manage and track all customer orders</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Order Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Status
              </label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {paymentStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Payment Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Orders List */}
          {isLoading ? (
            <div className="text-center py-16">
              <p className="text-gray-600">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-600 text-lg">No orders found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => handleOrderClick(order)}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-bold text-gray-900">
                          Order #{order.order_number}
                        </h2>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[order.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                          {order.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${paymentStatusColors[order.payment_status as keyof typeof paymentStatusColors] || 'bg-gray-100 text-gray-800'}`}>
                          {order.payment_status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-semibold">Customer:</span> {order.address_json.fullName}
                        </p>
                        <p>
                          <span className="font-semibold">Email:</span> {order.email}
                        </p>
                        <p>
                          <span className="font-semibold">Phone:</span> {order.phone || order.address_json.phone}
                        </p>
                        <p>
                          <span className="font-semibold">Date:</span>{' '}
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 mb-2">
                        {formatINR(order.total_cents / 100)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.items_json.length} item{order.items_json.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {order.tracking_number && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Tracking:</span> {order.tracking_number}
                        {order.shipping_provider && ` (${order.shipping_provider})`}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Order Details Modal */}
      <AnimatePresence>
        {showOrderDetails && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowOrderDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Order #{selectedOrder.order_number}
                </h2>
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Customer Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">Full Name</p>
                      <p className="text-gray-900">{selectedOrder.address_json.fullName}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">Email</p>
                      <p className="text-gray-900">{selectedOrder.email}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">Phone</p>
                      <p className="text-gray-900">{selectedOrder.phone || selectedOrder.address_json.phone}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">Address</p>
                      <p className="text-gray-900">
                        {selectedOrder.address_json.flat}, {selectedOrder.address_json.street}
                        {selectedOrder.address_json.landmark && `, ${selectedOrder.address_json.landmark}`}
                        <br />
                        {selectedOrder.address_json.city} - {selectedOrder.address_json.pincode}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items_json.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{item.title}</p>
                          {item.variant && (
                            <p className="text-sm text-gray-600">{item.variant}</p>
                          )}
                          <p className="text-sm text-gray-600">
                            Quantity: {item.quantity} × {formatINR(item.price)}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {formatINR(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-semibold text-gray-900">{formatINR(selectedOrder.subtotal_cents / 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-semibold text-gray-900">{formatINR(selectedOrder.shipping_cents / 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-semibold text-gray-900">{formatINR(selectedOrder.tax_cents / 100)}</span>
                    </div>
                    {selectedOrder.discount_cents > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Discount</span>
                        <span className="font-semibold text-green-600">-{formatINR(selectedOrder.discount_cents / 100)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-300">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-bold text-gray-900 text-lg">{formatINR(selectedOrder.total_cents / 100)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">Payment Method</p>
                      <p className="text-gray-900">{selectedOrder.payment_method || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">Payment Status</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${paymentStatusColors[selectedOrder.payment_status as keyof typeof paymentStatusColors] || 'bg-gray-100 text-gray-800'}`}>
                        {selectedOrder.payment_status}
                      </span>
                    </div>
                    {selectedOrder.payment_id && (
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">Payment ID</p>
                        <p className="text-gray-900 font-mono text-xs">{selectedOrder.payment_id}</p>
                      </div>
                    )}
                    {selectedOrder.payment_date && (
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">Payment Date</p>
                        <p className="text-gray-900">
                          {new Date(selectedOrder.payment_date).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Management */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Order</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Order Status
                      </label>
                      <select
                        value={updateForm.status}
                        onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        {statusOptions.filter(s => s !== 'all').map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Tracking Number
                        </label>
                        <input
                          type="text"
                          value={updateForm.tracking_number}
                          onChange={(e) => setUpdateForm({ ...updateForm, tracking_number: e.target.value })}
                          placeholder="Enter tracking number"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Shipping Provider
                        </label>
                        <input
                          type="text"
                          value={updateForm.shipping_provider}
                          onChange={(e) => setUpdateForm({ ...updateForm, shipping_provider: e.target.value })}
                          placeholder="e.g., FedEx, DHL"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Admin Notes
                      </label>
                      <textarea
                        value={updateForm.admin_notes}
                        onChange={(e) => setUpdateForm({ ...updateForm, admin_notes: e.target.value })}
                        placeholder="Add internal notes about this order..."
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      />
                    </div>

                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setShowOrderDetails(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateOrder}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdating ? 'Updating...' : 'Update Order'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status History */}
                {selectedOrder.status_history && selectedOrder.status_history.length > 0 && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Status History</h3>
                    <div className="space-y-2">
                      {selectedOrder.status_history.map((history, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-sm">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{history.status}</p>
                            <p className="text-gray-600">{history.note}</p>
                            <p className="text-gray-500 text-xs mt-1">
                              {new Date(history.timestamp).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={!!toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}


