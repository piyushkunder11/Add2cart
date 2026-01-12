'use client'

import { useOrdersStore } from '@/lib/store/orders'
import { formatINR } from '@/lib/utils/money'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import Navbar from '@/components/home/Navbar'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function OrdersPage() {
  const getAllOrders = useOrdersStore((state) => state.getAllOrders)
  const orders = getAllOrders()

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-base pt-20">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="mb-8">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded inline-block mb-4"
            >
              ← Back to Home
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Orders</h1>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-600 text-lg">No orders yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-base rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Order #{order.id.slice(-8)}</h2>
                      <p className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[order.status]}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      <span className="text-xl font-bold text-gray-900">
                        {formatINR(order.totalCents / 100)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-semibold">Customer:</span> {order.customerName}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Email:</span> {order.customerEmail}
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Items:</h3>
                    <div className="space-y-2">
                      {order.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center gap-4">
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
                            <p className="font-medium text-gray-900">{item.title}</p>
                            <p className="text-sm text-gray-600">
                              Qty: {item.quantity} × {formatINR(item.priceCents / 100)}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {formatINR((item.priceCents * item.quantity) / 100)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

