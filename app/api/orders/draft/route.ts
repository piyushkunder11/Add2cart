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

    // Generate order number
    let orderNumber: string
    try {
      const { data: generatedOrderNumber, error: orderNumberError } = await supabase.rpc(
        'generate_order_number'
      )

      if (orderNumberError || !generatedOrderNumber) {
        // Fallback: generate order number manually
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date().toISOString().split('T')[0])

        const orderCount = (count || 0) + 1
        orderNumber = `ORD-${dateStr}-${String(orderCount).padStart(5, '0')}`
      } else {
        orderNumber = generatedOrderNumber
      }
    } catch (error) {
      // Fallback: generate order number manually
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const timestamp = Date.now()
      orderNumber = `ORD-${dateStr}-${String(timestamp).slice(-5)}`
    }

    // Create draft order
    // Store razorpay_order_id in admin_notes for webhook lookup
    const { data: orderData, error: orderError } = await supabase
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

    if (orderError || !orderData) {
      console.error('[Draft Order] Failed to create draft order:', orderError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create draft order',
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

