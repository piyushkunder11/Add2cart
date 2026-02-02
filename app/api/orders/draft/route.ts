import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * POST /api/orders/draft
 * Creates a draft order (before payment)
 * 
 * PUT /api/orders/draft
 * Updates a draft order (on payment failure/cancellation)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      razorpay_order_id,
      email,
      user_id,
      phone,
      address_json,
      items_json,
      subtotal_cents,
      shipping_cents = 0,
      tax_cents = 0,
      discount_cents = 0,
      total_cents,
    } = body

    // Validate required fields
    if (!razorpay_order_id || !email || !address_json || !items_json || total_cents === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: razorpay_order_id, email, address_json, items_json, and total_cents are required',
        },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Generate order number with retry logic to handle duplicates
    let orderNumber: string
    let orderData: { id: string; order_number: string } | null = null
    let orderError: any = null
    const maxRetries = 5
    let retryCount = 0

    while (!orderData && retryCount < maxRetries) {
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
            console.warn('[Draft Order] Order number collision detected, generating new one:', orderNumber)
          }
          const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
          const timestamp = Date.now()
          const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
          orderNumber = `ORD-${dateStr}-${String(timestamp).slice(-6)}-${randomSuffix}`
          retryCount++
          continue
        }

        // Create draft order
        // Store razorpay_order_id in admin_notes for webhook lookup
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
            payment_status: 'pending',
            status: 'pending',
            admin_notes: `Razorpay Order ID: ${razorpay_order_id}`,
            status_history: [
              {
                status: 'pending',
                timestamp: new Date().toISOString(),
                note: `Draft order created, awaiting payment (Razorpay Order: ${razorpay_order_id})`,
              },
            ],
          })
          .select('id, order_number')
          .single()

        // Check if error is due to duplicate order number
        if (insertedOrderError?.code === '23505' || insertedOrderError?.message?.includes('duplicate') || insertedOrderError?.message?.includes('unique')) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[Draft Order] Duplicate order number detected, retrying:', {
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

        orderData = insertedOrderData
        orderError = insertedOrderError
        break
      } catch (error) {
        // Fallback: generate order number manually with high randomness
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Draft Order] Error generating order number, using fallback:', error)
        }
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
        const timestamp = Date.now()
        const randomSuffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
        orderNumber = `ORD-${dateStr}-${String(timestamp).slice(-6)}-${randomSuffix}`
        retryCount++
        
        if (retryCount >= maxRetries) {
          orderError = error
          break
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 100 * retryCount))
      }
    }

    if (orderError || !orderData) {
      console.error('[Draft Order] Failed to create draft order after retries:', {
        error: orderError,
        code: orderError?.code,
        message: orderError?.message,
        retryCount,
      })
      
      let errorMessage = 'Failed to create draft order'
      if (orderError?.code === '23505' || orderError?.message?.includes('duplicate') || orderError?.message?.includes('unique')) {
        errorMessage = 'Failed to create draft order: Unable to generate unique order number. Please try again.'
      }
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          message: orderError?.message || 'Unknown error',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      order_id: orderData.id,
      order_number: orderNumber,
    })
  } catch (error: any) {
    console.error('[Draft Order] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id, payment_status, status, note } = body

    if (!order_id || !payment_status) {
      return NextResponse.json(
        {
          success: false,
          error: 'order_id and payment_status are required',
        },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Get current order to append to status_history
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('status_history')
      .eq('id', order_id)
      .single()

    const statusHistory = currentOrder?.status_history || []
    statusHistory.push({
      status: status || 'pending',
      timestamp: new Date().toISOString(),
      note: note || `Payment ${payment_status}`,
    })

    // Update order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .update({
        payment_status,
        status: status || 'pending',
        status_history: statusHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id)
      .select('id, order_number')
      .single()

    if (orderError || !orderData) {
      console.error('[Draft Order] Failed to update order:', orderError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update order',
          message: orderError?.message || 'Unknown error',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      order_id: orderData.id,
      order_number: orderData.order_number,
    })
  } catch (error: any) {
    console.error('[Draft Order] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

