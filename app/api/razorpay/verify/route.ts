import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getRazorpayKeySecret } from '@/lib/razorpay/env-validation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * POST /api/razorpay/verify
 * 
 * Verifies a Razorpay payment signature to ensure the payment is legitimate.
 * 
 * Request body:
 * - razorpay_payment_id: string (required)
 * - razorpay_order_id: string (required)
 * - razorpay_signature: string (required)
 * - checkoutData: object (optional) - additional checkout data for logging
 * 
 * Response:
 * - success: boolean (true if signature is valid, false otherwise)
 * - error?: string (error message if verification fails)
 * 
 * This route uses RAZORPAY_KEY_SECRET which should NEVER be exposed to the client.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, checkoutData } = body

    // Log incoming request (without sensitive data) - dev only
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Razorpay Verify] Request received:', {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id ? `${razorpay_payment_id.substring(0, 10)}...` : 'missing',
        has_signature: !!razorpay_signature,
        has_checkout_data: !!checkoutData,
        timestamp: new Date().toISOString(),
      })
    }

    // Validate required fields
    if (!razorpay_order_id || typeof razorpay_order_id !== 'string' || razorpay_order_id.trim() === '') {
      console.error('[Razorpay Verify] Validation failed: razorpay_order_id is missing or invalid')
      return NextResponse.json(
        {
          success: false,
          error: 'razorpay_order_id is required and must be a non-empty string',
        },
        { status: 400 }
      )
    }

    if (!razorpay_payment_id || typeof razorpay_payment_id !== 'string' || razorpay_payment_id.trim() === '') {
      console.error('[Razorpay Verify] Validation failed: razorpay_payment_id is missing or invalid')
      return NextResponse.json(
        {
          success: false,
          error: 'razorpay_payment_id is required and must be a non-empty string',
        },
        { status: 400 }
      )
    }

    if (!razorpay_signature || typeof razorpay_signature !== 'string' || razorpay_signature.trim() === '') {
      console.error('[Razorpay Verify] Validation failed: razorpay_signature is missing or invalid')
      return NextResponse.json(
        {
          success: false,
          error: 'razorpay_signature is required and must be a non-empty string',
        },
        { status: 400 }
      )
    }

    // Get the secret key (server-side only)
    let keySecret: string
    try {
      keySecret = getRazorpayKeySecret()
    } catch (error) {
      console.error('[Razorpay Verify] Failed to get key secret:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error: Razorpay key secret is not available',
        },
        { status: 500 }
      )
    }

    // Create the message string for signature verification
    // Format: order_id|payment_id
    const message = `${razorpay_order_id}|${razorpay_payment_id}`

    // Generate HMAC SHA256 hash
    let expectedSignature: string
    try {
      expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(message)
        .digest('hex')
    } catch (error) {
      console.error('[Razorpay Verify] HMAC generation failed:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Signature verification failed: Error generating expected signature',
        },
        { status: 500 }
      )
    }

    // Use timing-safe comparison to prevent timing attacks
    // Both signatures are hex strings, so compare them directly
    // Convert to buffers for timing-safe comparison
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
    const receivedBuffer = Buffer.from(razorpay_signature, 'utf8')

    // timingSafeEqual requires buffers of the same length
    if (expectedBuffer.length !== receivedBuffer.length) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Razorpay Verify] Signature length mismatch:', {
          expected_length: expectedBuffer.length,
          received_length: receivedBuffer.length,
          order_id: razorpay_order_id,
        })
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payment signature',
        },
        { status: 400 }
      )
    }

    let isValid: boolean
    try {
      isValid = crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    } catch (error) {
      console.error('[Razorpay Verify] Timing-safe comparison failed:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Signature verification failed: Error during comparison',
        },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime

    if (isValid) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Razorpay Verify] Signature verified successfully:', {
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id,
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        })
      }

      // Insert order into Supabase if checkoutData is provided
      if (checkoutData) {
        try {
          let supabase
          try {
            supabase = createServerSupabaseClient()
          } catch (supabaseError: any) {
            console.error('[Razorpay Verify] Failed to create Supabase client:', supabaseError)
            return NextResponse.json(
              {
                success: false,
                error: 'Server configuration error: Supabase is not configured',
                message: supabaseError?.message || 'Missing Supabase environment variables',
              },
              { status: 500 }
            )
          }

          // Extract data from checkoutData
          const {
            email,
            phone,
            user_id,
            address_json,
            items_json,
            subtotal_cents,
            shipping_cents = 0,
            tax_cents = 0,
            discount_cents = 0,
            total_cents,
            draft_order_id,
          } = checkoutData

          // Validate required fields
          if (!email || !address_json || !items_json || total_cents === undefined) {
            console.error('[Razorpay Verify] Missing required checkout data fields:', {
              has_email: !!email,
              has_address: !!address_json,
              has_items: !!items_json,
              has_total: total_cents !== undefined,
            })
            return NextResponse.json(
              {
                success: false,
                error: 'Missing required checkout data: email, address_json, items_json, and total_cents are required',
              },
              { status: 400 }
            )
          }

          // Validate data types
          if (typeof email !== 'string' || email.trim() === '') {
            console.error('[Razorpay Verify] Invalid email format')
            return NextResponse.json(
              {
                success: false,
                error: 'Invalid email: must be a non-empty string',
              },
              { status: 400 }
            )
          }

          if (!Array.isArray(items_json) || items_json.length === 0) {
            console.error('[Razorpay Verify] Invalid items_json: must be a non-empty array')
            return NextResponse.json(
              {
                success: false,
                error: 'Invalid items: must be a non-empty array',
              },
              { status: 400 }
            )
          }

          if (typeof total_cents !== 'number' || total_cents <= 0) {
            console.error('[Razorpay Verify] Invalid total_cents:', total_cents)
            return NextResponse.json(
              {
                success: false,
                error: 'Invalid total: must be a positive number',
              },
              { status: 400 }
            )
          }

          // Check if draft order exists and update it, otherwise create new
          let orderData: { id: string; order_number: string } | null = null
          let orderError: any = null

          if (draft_order_id) {
            // Update existing draft order
            const { data: currentOrder, error: fetchError } = await supabase
              .from('orders')
              .select('status_history, order_number')
              .eq('id', draft_order_id)
              .single()

            if (fetchError) {
              if (process.env.NODE_ENV !== 'production') {
                console.warn('[Razorpay Verify] Draft order not found, will create new order:', {
                  draft_order_id,
                  error: fetchError.message,
                })
              }
              // Draft order not found, will create new one below
            } else if (currentOrder) {
              const statusHistory = currentOrder?.status_history || []
              statusHistory.push({
                status: 'confirmed',
                timestamp: new Date().toISOString(),
                note: 'Payment received via Razorpay',
              })

              const { data: updatedOrder, error: updateError } = await supabase
                .from('orders')
                .update({
                  payment_status: 'paid',
                  payment_id: razorpay_payment_id,
                  payment_date: new Date().toISOString(),
                  status: 'confirmed',
                  status_history: statusHistory,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', draft_order_id)
                .select('id, order_number')
                .single()

              if (updateError) {
                if (process.env.NODE_ENV !== 'production') {
                  console.warn('[Razorpay Verify] Failed to update draft order, will create new order:', {
                    draft_order_id,
                    error: updateError.message,
                    code: updateError.code,
                  })
                }
                // Update failed, will create new one below
                orderError = null // Reset error to allow creating new order
              } else {
                orderData = updatedOrder
              }
            }
          }

          // If no draft order or update failed, create new order
          if (!orderData || orderError) {
            // Generate order number with retry logic to handle duplicates
            let orderNumber: string
            let newOrderData: { id: string; order_number: string } | null = null
            let newOrderError: any = null
            const maxRetries = 5
            let retryCount = 0

            while (!newOrderData && retryCount < maxRetries) {
              try {
                // Generate order number using the database function
                const { data: generatedOrderNumber, error: orderNumberError } = await supabase.rpc(
                  'generate_order_number'
                )

                if (orderNumberError || !generatedOrderNumber) {
                  // Fallback: generate order number manually with timestamp to ensure uniqueness
                  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
                  const timestamp = Date.now()
                  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
                  orderNumber = `ORD-${dateStr}-${String(timestamp).slice(-5)}-${randomSuffix}`
                } else {
                  orderNumber = generatedOrderNumber
                }

                // Check if order number already exists
                const { data: existingOrder } = await supabase
                  .from('orders')
                  .select('id')
                  .eq('order_number', orderNumber)
                  .maybeSingle()

                if (existingOrder) {
                  // Order number exists, generate a new one with random suffix
                  if (process.env.NODE_ENV !== 'production') {
                    console.warn('[Razorpay Verify] Order number collision detected, generating new one:', orderNumber)
                  }
                  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
                  const timestamp = Date.now()
                  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
                  orderNumber = `ORD-${dateStr}-${String(timestamp).slice(-6)}-${randomSuffix}`
                  retryCount++
                  continue
                }

                // Insert order with generated order number
                const { data: insertedOrderData, error: insertedOrderError } = await supabase
                  .from('orders')
                  .insert({
                    order_number: orderNumber,
                    user_id: user_id || null,
                    email,
                    phone: phone || null,
                    address_json,
                    items_json,
                    subtotal_cents: subtotal_cents || total_cents,
                    shipping_cents,
                    tax_cents,
                    discount_cents,
                    total_cents,
                    payment_method: 'razorpay',
                    payment_status: 'paid',
                    payment_id: razorpay_payment_id,
                    payment_date: new Date().toISOString(),
                    status: 'confirmed',
                    status_history: [
                      {
                        status: 'confirmed',
                        timestamp: new Date().toISOString(),
                        note: 'Payment received via Razorpay',
                      },
                    ],
                  })
                  .select('id, order_number')
                  .single()

                // Check if error is due to duplicate order number
                if (insertedOrderError?.code === '23505' || insertedOrderError?.message?.includes('duplicate') || insertedOrderError?.message?.includes('unique')) {
                  if (process.env.NODE_ENV !== 'production') {
                    console.warn('[Razorpay Verify] Duplicate order number detected, retrying:', {
                      orderNumber,
                      error: insertedOrderError.message,
                      retryCount: retryCount + 1,
                    })
                  }
                  retryCount++
                  // Wait a bit before retrying to avoid race conditions
                  await new Promise(resolve => setTimeout(resolve, 100 * retryCount))
                  continue
                }

                newOrderData = insertedOrderData
                newOrderError = insertedOrderError
                break
              } catch (error) {
                // Fallback: generate order number manually with high randomness
                if (process.env.NODE_ENV !== 'production') {
                  console.warn('[Razorpay Verify] Error generating order number, using fallback:', error)
                }
                const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
                const timestamp = Date.now()
                const randomSuffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
                orderNumber = `ORD-${dateStr}-${String(timestamp).slice(-6)}-${randomSuffix}`
                retryCount++
                
                if (retryCount >= maxRetries) {
                  newOrderError = error
                  break
                }
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 100 * retryCount))
              }
            }

            orderData = newOrderData
            orderError = newOrderError
          }

          if (orderError || !orderData) {
            console.error('[Razorpay Verify] Failed to insert order:', {
              error: orderError,
              code: orderError?.code,
              message: orderError?.message,
              details: orderError?.details,
              hint: orderError?.hint,
              has_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            })
            
            // Provide more specific error messages
            let errorMessage = 'Failed to create order'
            if (orderError?.code === 'PGRST116') {
              errorMessage = 'Order creation failed: Database connection error. Please check Supabase configuration.'
            } else if (orderError?.code === '23505' || orderError?.message?.includes('duplicate') || orderError?.message?.includes('unique')) {
              errorMessage = 'Order creation failed: Unable to generate unique order number. Please try again.'
            } else if (orderError?.message?.includes('permission denied') || orderError?.message?.includes('RLS') || orderError?.message?.includes('row-level security')) {
              errorMessage = 'Order creation failed: Permission denied. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in your environment variables to bypass RLS policies.'
            } else if (orderError?.message?.includes('JWT') || orderError?.message?.includes('invalid')) {
              errorMessage = 'Order creation failed: Invalid Supabase credentials. Please check your environment variables.'
            } else if (orderError?.message) {
              errorMessage = `Order creation failed: ${orderError.message}`
            }
            
            return NextResponse.json(
              {
                success: false,
                error: errorMessage,
                message: orderError?.message || 'Unknown error',
                details: process.env.NODE_ENV === 'development' ? {
                  ...orderError?.details,
                  has_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                  error_code: orderError?.code,
                } : undefined,
              },
              { status: 500 }
            )
          }

          if (process.env.NODE_ENV !== 'production') {
            console.log('[Razorpay Verify] Order created successfully:', {
              order_id: orderData.id,
              order_number: orderData.order_number,
              payment_id: razorpay_payment_id,
            })
          }

          return NextResponse.json({
            success: true,
            order_id: orderData.id,
            order_number: orderData.order_number,
          })
        } catch (orderError: any) {
          console.error('[Razorpay Verify] Error creating order:', orderError)
          return NextResponse.json(
            {
              success: false,
              error: orderError instanceof Error && orderError.message
                ? `Order creation failed: ${orderError.message}`
                : 'Order creation failed',
              message: orderError instanceof Error ? orderError.message : 'Unknown error',
            },
            { status: 500 }
          )
        }
      }

      // If no checkoutData, just return success (for backward compatibility)
      return NextResponse.json({
        success: true,
      })
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Razorpay Verify] Invalid signature detected:', {
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id,
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        })
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payment signature',
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error('[Razorpay Verify] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    })

    // Handle validation errors from our code
    if (error instanceof Error && error.message.includes('must only be called on the server')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error: Invalid server-side call',
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Handle missing environment variables
    if (error instanceof Error && error.message.includes('environment variables')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error: Razorpay environment variables are not configured',
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError || error.message?.includes('JSON')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body: Expected valid JSON',
        },
        { status: 400 }
      )
    }

    // Generic server error
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

