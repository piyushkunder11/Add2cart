'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { useRef, useState, useEffect } from 'react'
import { useCartStore } from '@/lib/store/cart'
import { useAuthStore } from '@/lib/store/auth'

// Import router for navigation
import { useRouter } from 'next/navigation'
import { formatINR } from '@/lib/utils/money'
import Toast from '@/components/ui/Toast'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface AddressForm {
  fullName: string
  phone: string
  email: string
  pincode: string
  flat: string
  street: string
  landmark: string
  city: string
  saveAddress: boolean
  upiId: string
}

export default function CheckoutPage() {
  const items = useCartStore((state) => state.items)
  const subtotal = useCartStore((state) => state.getTotalPrice())
  const clearCart = useCartStore((state) => state.clearCart)
  const { user, isAuthenticated } = useAuthStore()
  const prefersReducedMotion = useReducedMotion()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [address, setAddress] = useState<AddressForm>({
    fullName: '',
    phone: '',
    email: '',
    pincode: '',
    flat: '',
    street: '',
    landmark: '',
    city: '',
    saveAddress: false,
    upiId: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [draftOrderId, setDraftOrderId] = useState<string | null>(null)
  const [lastRazorpayOrderId, setLastRazorpayOrderId] = useState<string | null>(null)
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({})

  // Load Razorpay script safely (only once)
  useEffect(() => {
    // Check if Razorpay is already loaded
    if (window.Razorpay) {
      setRazorpayLoaded(true)
      return
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existingScript) {
      // Script exists, wait for it to load
      const checkRazorpay = setInterval(() => {
        if (window.Razorpay) {
          setRazorpayLoaded(true)
          clearInterval(checkRazorpay)
        }
      }, 100)

      return () => clearInterval(checkRazorpay)
    }

    // Create and load script
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => {
      setRazorpayLoaded(true)
    }
    script.onerror = () => {
      setToast({ message: 'Failed to load Razorpay. Please refresh the page.', type: 'error' })
      setErrors((prev) => ({ ...prev, payment: 'Failed to load Razorpay. Please refresh the page.' }))
    }
    document.body.appendChild(script)

    // Don't remove script on unmount - keep it for future use
  }, [])

  const assignRef = (field: string) => (el: HTMLInputElement | HTMLTextAreaElement | null) => {
    fieldRefs.current[field] = el
  }

  const handleAddressChange = (field: keyof AddressForm, value: string | boolean) => {
    setAddress((prev) => ({ ...prev, [field]: value }))
  }

  const validate = (data: AddressForm) => {
    const nextErrors: Record<string, string> = {}
    if (!data.fullName.trim()) nextErrors.fullName = 'Full name is required'
    if (!/^[6-9]\d{9}$/.test(data.phone.trim())) nextErrors.phone = 'Enter a valid 10 digit mobile number'
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) nextErrors.email = 'Enter a valid email'
    if (!/^\d{6}$/.test(data.pincode.trim())) nextErrors.pincode = 'Enter 6 digit PIN code'
    if (!data.flat.trim()) nextErrors.flat = 'House / Flat number is required'
    if (!data.street.trim()) nextErrors.street = 'Street / Locality is required'
    if (!data.city.trim()) nextErrors.city = 'City is required'
    return nextErrors
  }

  const handleProceedToPayment = async () => {
    // Prevent double payment - disable if already processing
    if (isProcessing) {
      return
    }

    const nextErrors = validate(address)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      const firstErrorKey = Object.keys(nextErrors).find((key) => key !== 'payment')
      if (firstErrorKey && fieldRefs.current[firstErrorKey]) {
        fieldRefs.current[firstErrorKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        fieldRefs.current[firstErrorKey]?.focus()
      }
      return
    }

    if (items.length === 0) return
    if (!razorpayLoaded || !window.Razorpay) {
      setErrors((prev) => ({ ...prev, payment: 'Razorpay is still loading. Please wait...' }))
      return
    }

    setIsProcessing(true)
    setErrors((prev) => {
      const { payment, ...rest } = prev
      return rest
    })

    try {
      // Convert total from rupees to paise (multiply by 100)
      const amountPaise = Math.round(total * 100)

      // Create order on server
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amountPaise,
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
          notes: {
            address: `${address.flat}, ${address.street}, ${address.city} - ${address.pincode}`,
            phone: address.phone,
            email: address.email || '',
            items: JSON.stringify(items.map((item) => ({ id: item.id, title: item.title, qty: item.qty }))),
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage =
          errorData.message || errorData.error || 'Failed to create payment order'
        
        // If it's a server configuration error, provide helpful message
        if (errorMessage.includes('environment variables') || errorMessage.includes('not configured')) {
          throw new Error(
            'Razorpay is not configured. Please ensure .env.local contains the required keys and restart your dev server.'
          )
        }
        
        throw new Error(errorMessage)
      }

      const orderData = await response.json()
      setLastRazorpayOrderId(orderData.orderId)

      // Get Razorpay Key ID from environment (public, safe for client)
      // Note: NEXT_PUBLIC_* vars are embedded at BUILD TIME in Next.js
      // If you changed env vars in Vercel, you MUST redeploy for changes to take effect
      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      if (!keyId) {
        throw new Error(
          'Razorpay Key ID is not configured. Please ensure NEXT_PUBLIC_RAZORPAY_KEY_ID is set in environment variables and redeploy.'
        )
      }

      // Runtime validation: Check if test key is being used (warn in production)
      if (keyId.startsWith('rzp_test_')) {
        const isProduction = process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost'
        if (isProduction) {
          console.error(
            '[Razorpay] ⚠️ SECURITY WARNING: Test key detected in production!',
            'The app is using a TEST key (rzp_test_*) but you are in production.',
            'This means the environment variable was not updated or the app was not redeployed after updating env vars.',
            'Please:',
            '1. Set NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_S7kDmwYpRWBgoy in Vercel',
            '2. Redeploy the application',
            '3. Clear browser cache and try again'
          )
          throw new Error(
            'Razorpay is configured in TEST mode. Please update NEXT_PUBLIC_RAZORPAY_KEY_ID to your LIVE key in Vercel and redeploy the application.'
          )
        } else {
          console.warn('[Razorpay] Running in TEST mode (rzp_test_*). This is OK for local development.')
        }
      } else if (keyId.startsWith('rzp_live_')) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Razorpay] Running in LIVE mode (rzp_live_*). Make sure this is intentional for local testing.')
        }
      }

      // Create draft order before opening payment modal
      try {
        const orderEmail = 
          (isAuthenticated && user?.email) || 
          address.email?.trim() || 
          `customer-${address.phone}@temp.com`
        
        const draftOrderResponse = await fetch('/api/orders/draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            razorpay_order_id: orderData.orderId,
            email: orderEmail,
            user_id: isAuthenticated && user?.id ? user.id : null,
            phone: address.phone,
            address_json: {
              fullName: address.fullName,
              phone: address.phone,
              email: address.email || '',
              pincode: address.pincode,
              flat: address.flat,
              street: address.street,
              landmark: address.landmark || '',
              city: address.city,
            },
            items_json: items.map((item) => ({
              id: item.id,
              title: item.title,
              price: item.price,
              quantity: item.qty,
              image: item.image,
              variant: item.variant || null,
            })),
            subtotal_cents: Math.round(subtotal * 100),
            shipping_cents: 0,
            tax_cents: 0,
            discount_cents: 0,
            total_cents: Math.round(total * 100),
          }),
        })

        if (draftOrderResponse.ok) {
          const draftData = await draftOrderResponse.json()
          setDraftOrderId(draftData.order_id)
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Failed to create draft order, continuing with payment flow')
          }
        }
      } catch (draftError) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Error creating draft order, continuing with payment flow:', draftError)
        }
      }

      // Initialize Razorpay checkout
      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Add2Cart',
        description: `Order for ${items.length} item(s)`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // Verify payment signature and create order on server
          try {
            // Prepare checkout data for order creation
            // Prioritize authenticated user's email, then checkout form email, then temp email
            const orderEmail = 
              (isAuthenticated && user?.email) || 
              address.email?.trim() || 
              `customer-${address.phone}@temp.com`
            
            const checkoutData = {
              email: orderEmail,
              user_id: isAuthenticated && user?.id ? user.id : null,
              phone: address.phone,
              address_json: {
                fullName: address.fullName,
                phone: address.phone,
                email: address.email || '',
                pincode: address.pincode,
                flat: address.flat,
                street: address.street,
                landmark: address.landmark || '',
                city: address.city,
              },
              items_json: items.map((item) => ({
                id: item.id,
                title: item.title,
                price: item.price,
                quantity: item.qty,
                image: item.image,
                variant: item.variant || null,
              })),
              subtotal_cents: Math.round(subtotal * 100),
              shipping_cents: 0, // Free shipping
              tax_cents: 0,
              discount_cents: 0,
              total_cents: Math.round(total * 100),
              draft_order_id: draftOrderId, // Include draft order ID if exists
            }

            const verifyResponse = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                checkoutData,
              }),
            })

            const verifyData = await verifyResponse.json()

            // Treat non-2xx as failure too (and surface the best message available)
            if (!verifyResponse.ok || !verifyData?.success) {
              // Update draft order to failed if verification fails
              if (draftOrderId) {
                try {
                  await fetch('/api/orders/draft', {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      order_id: draftOrderId,
                      payment_status: 'failed',
                      status: 'pending',
                      note: `Payment verification failed: ${verifyData.error || 'Unknown error'}`,
                    }),
                  })
                } catch (updateError) {
                  console.error('Failed to update order status:', updateError)
                }
                setDraftOrderId(null)
              }
              
              const bestMessage =
                verifyData?.error ||
                verifyData?.message ||
                `Payment verification failed (${verifyResponse.status})`
              throw new Error(bestMessage)
            }

            // Payment verified and order created successfully
            setIsProcessing(false)
            
            // Clear draft order ID since order is now confirmed
            setDraftOrderId(null)
            
            // Clear cart
            clearCart()
            
            setToast({ message: 'Payment successful! Order placed.', type: 'success' })
            setErrors((prev) => {
              const { payment, ...rest } = prev
              return rest
            })

            // Redirect to order success page
            if (verifyData.order_id) {
              const params = new URLSearchParams({ id: verifyData.order_id })
              if (verifyData.order_number) {
                params.set('order_number', verifyData.order_number)
              }
              router.push(`/order-success?${params.toString()}`)
            } else {
              // Fallback redirect
              router.push('/order-success')
            }
          } catch (error) {
            setIsProcessing(false)
            const errorMessage = error instanceof Error ? error.message : 'Payment verification failed. Please contact support.'
            setToast({ 
              message: `${errorMessage}. Your cart has been preserved.`, 
              type: 'error' 
            })
            setErrors((prev) => ({
              ...prev,
              payment: errorMessage,
            }))
          }
        },
        prefill: {
          name: address.fullName,
          email: address.email || '',
          contact: address.phone,
        },
        notes: {
          address: `${address.flat}, ${address.street}, ${address.city} - ${address.pincode}`,
        },
        theme: {
          color: '#000000',
        },
        modal: {
          ondismiss: async function () {
            setIsProcessing(false)
            
            // Update draft order to cancelled if it exists
            if (draftOrderId) {
              try {
                await fetch('/api/orders/draft', {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    order_id: draftOrderId,
                    payment_status: 'cancelled',
                    status: 'cancelled',
                    note: 'Payment cancelled by user',
                  }),
                })
              } catch (error) {
                console.error('Failed to update order status:', error)
              }
              setDraftOrderId(null)
            }
            
            setToast({ 
              message: 'Payment cancelled. Your cart has been preserved.', 
              type: 'error' 
            })
          },
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', async function (response: any) {
        setIsProcessing(false)
        
        // Update draft order to failed if it exists
        if (draftOrderId) {
          try {
            await fetch('/api/orders/draft', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                order_id: draftOrderId,
                payment_status: 'failed',
                status: 'pending',
                note: `Payment failed: ${response.error?.description || response.error?.reason || 'Unknown error'}`,
              }),
            })
          } catch (error) {
            console.error('Failed to update order status:', error)
          }
          setDraftOrderId(null)
        }
        
        const errorMessage = `Payment failed: ${response.error?.description || response.error?.reason || 'Unknown error'}`
        setToast({ 
          message: `${errorMessage}. Your cart has been preserved. You can try again.`, 
          type: 'error' 
        })
        setErrors((prev) => ({
          ...prev,
          payment: errorMessage,
        }))
      })

      razorpay.open()
    } catch (error) {
      setIsProcessing(false)
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.'
      setToast({ message: errorMessage, type: 'error' })
      setErrors((prev) => ({
        ...prev,
        payment: errorMessage,
      }))
    }
  }

  const isAddressValid = Object.keys(validate(address)).length === 0
  const isFormReady = items.length > 0 && isAddressValid
  const total = subtotal

  return (
    <div className="min-h-screen bg-[#E0E0E0]">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={!!toast}
          onClose={() => setToast(null)}
          duration={toast.type === 'success' ? 4000 : 5000}
        />
      )}

      <div className="container mx-auto px-4 py-8 md:py-12">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto"
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-500">Secure Checkout</p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Review & Pay</h1>
            </div>
            <p className="text-gray-600 text-sm md:text-base">
              Need help? <span className="text-gray-900 font-semibold">support@store.com</span>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
            {/* Left Column */}
            <div className="space-y-6 order-1">
              <motion.div
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 15 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-[0_10px_25px_rgba(0,0,0,0.08)]"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
                {items.length === 0 ? (
                  <p className="text-gray-600">Your cart is empty.</p>
                ) : (
                  <div className="space-y-4">
                  {items.map((item) => (
                      <div
                        key={`${item.id}-${item.variant || ''}`}
                        className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{item.title}</p>
                          <p className="text-sm text-gray-500">
                            {item.variant ? `${item.variant} · ` : ''}
                            Qty: {item.qty}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatINR(item.price)}</p>
                          <p className="text-sm text-gray-500">Item total: {formatINR(item.price * item.qty)}</p>
                        </div>
                    </div>
                  ))}
                </div>
                )}
                <div className="mt-6 space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-900">{formatINR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span className="font-semibold text-emerald-600">Free</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-3">
                    <span>Total Payable</span>
                    <span>{formatINR(total)}</span>
                  </div>
                </div>
                <div className="mt-4 text-sm">
                  <Link href="/cart" className="text-black font-semibold hover:underline">
                    Change items / Back to Cart
                  </Link>
              </div>
              </motion.div>
            </div>

            {/* Right Column */}
            <div className="space-y-6 order-2">
              <motion.div
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 15 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-[0_10px_25px_rgba(0,0,0,0.08)] space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Delivery Address</h2>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Step 1</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="fullName" className="text-sm font-semibold text-gray-700">Full Name *</label>
                    <input
                      id="fullName"
                      ref={assignRef('fullName')}
                      value={address.fullName}
                      onChange={(e) => handleAddressChange('fullName', e.target.value)}
                      placeholder="e.g. Rohan Sharma"
                      className={`mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                        errors.fullName ? 'border-red-400' : 'border-gray-300'
                      }`}
                    />
                    {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="phone" className="text-sm font-semibold text-gray-700">Mobile Number *</label>
                      <input
                        id="phone"
                        ref={assignRef('phone')}
                        value={address.phone}
                        onChange={(e) => handleAddressChange('phone', e.target.value)}
                        placeholder="+91 98765 43210"
                        className={`mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                          errors.phone ? 'border-red-400' : 'border-gray-300'
                        }`}
                      />
                      {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                      <label htmlFor="email" className="text-sm font-semibold text-gray-700">Email (optional)</label>
                      <input
                        id="email"
                        ref={assignRef('email')}
                        value={address.email}
                        onChange={(e) => handleAddressChange('email', e.target.value)}
                        placeholder="you@example.com"
                        className={`mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                          errors.email ? 'border-red-400' : 'border-gray-300'
                        }`}
                      />
                      {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="pincode" className="text-sm font-semibold text-gray-700">PIN Code *</label>
                      <input
                        id="pincode"
                        ref={assignRef('pincode')}
                        value={address.pincode}
                        onChange={(e) => handleAddressChange('pincode', e.target.value)}
                        placeholder="e.g. 560001"
                        className={`mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                          errors.pincode ? 'border-red-400' : 'border-gray-300'
                        }`}
                      />
                      {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
                    </div>
                    <div>
                      <label htmlFor="city" className="text-sm font-semibold text-gray-700">City *</label>
                      <input
                        id="city"
                        ref={assignRef('city')}
                        value={address.city}
                        onChange={(e) => handleAddressChange('city', e.target.value)}
                        placeholder="Bengaluru"
                        className={`mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                          errors.city ? 'border-red-400' : 'border-gray-300'
                        }`}
                      />
                      {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                    </div>
                  </div>
                  <div>
                    <label htmlFor='flat' className="text-sm font-semibold text-gray-700">Flat / House no. / Building *</label>
                    <input
                      id="flat"
                      ref={assignRef('flat')}
                      value={address.flat}
                      onChange={(e) => handleAddressChange('flat', e.target.value)}
                      placeholder="Apartment 402, Block B"
                      className={`mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                        errors.flat ? 'border-red-400' : 'border-gray-300'
                      }`}
                    />
                    {errors.flat && <p className="text-xs text-red-500 mt-1">{errors.flat}</p>}
                  </div>
                  <div>
                    <label htmlFor="street" className="text-sm font-semibold text-gray-700">Street / Area / Locality *</label>
                    <textarea
                      id="street"
                      ref={assignRef('street')}
                      value={address.street}
                      onChange={(e) => handleAddressChange('street', e.target.value)}
                      placeholder="Example: Park Street, Near Metro Station"
                      rows={2}
                      className={`mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                        errors.street ? 'border-red-400' : 'border-gray-300'
                      }`}
                    />
                    {errors.street && <p className="text-xs text-red-500 mt-1">{errors.street}</p>}
                  </div>
                  <div>
                    <label htmlFor="landmark" className="text-sm font-semibold text-gray-700">Landmark (optional)</label>
                    <input
                      id="landmark"
                      ref={assignRef('landmark')}
                      value={address.landmark}
                      onChange={(e) => handleAddressChange('landmark', e.target.value)}
                      placeholder="Opposite to City Mall"
                      className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={address.saveAddress}
                      onChange={(e) => handleAddressChange('saveAddress', e.target.checked)}
                      className="rounded border-gray-300 text-black focus:ring-black"
                    />
                    Save this address for future orders
                  </label>
                </div>
              </motion.div>

              <motion.div
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 15 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-[0_10px_25px_rgba(0,0,0,0.08)] space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Payment</h2>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Step 2</span>
                </div>
                <div className="rounded-xl border border-dashed border-black/30 bg-black/5 p-4 space-y-2">
                  <p className="font-semibold text-gray-900">Pay with Razorpay</p>
                  <p className="text-sm text-gray-600">
                    You will be redirected to Razorpay to pay using UPI, cards, net banking or wallets.
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Amount payable</span>
                    <span className="text-lg font-bold text-gray-900">{formatINR(total)}</span>
                  </div>
                  {errors.payment && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                      <p className="text-sm text-red-600">{errors.payment}</p>
                      {errors.payment.includes('failed') || errors.payment.includes('cancelled') ? (
                        <button
                          onClick={handleProceedToPayment}
                          disabled={!isFormReady || isProcessing || !razorpayLoaded}
                          className="text-sm font-semibold text-red-600 hover:text-red-700 underline"
                        >
                          Retry Payment
                        </button>
                      ) : null}
                    </div>
                  )}
                <motion.button
                  onClick={handleProceedToPayment}
                    disabled={!isFormReady || isProcessing || !razorpayLoaded}
                    whileHover={prefersReducedMotion || !isFormReady ? undefined : { scale: 1.01 }}
                    whileTap={prefersReducedMotion || !isFormReady ? undefined : { scale: 0.99 }}
                    className={`w-full px-6 py-3 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-4 focus:ring-black/20 ${
                      !isFormReady || isProcessing || !razorpayLoaded
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-black text-white hover:bg-gray-900'
                    }`}
                  >
                    {!razorpayLoaded
                      ? 'Loading Razorpay...'
                      : isProcessing
                        ? 'Processing...'
                        : `Pay ${formatINR(total)} with Razorpay`}
                </motion.button>
                <Link
                  href="/cart"
                    className="block w-full text-center px-6 py-3 rounded-lg border border-black text-black hover:bg-black hover:text-white transition-colors font-semibold"
                >
                  Back to Cart
                </Link>
              </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

