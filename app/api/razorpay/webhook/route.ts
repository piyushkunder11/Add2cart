import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getRazorpayKeySecret } from '@/lib/razorpay/env-validation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Disable body parsing to get raw body for signature verification
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/razorpay/webhook
 * 
 * Handles Razorpay webhook events for payment status updates.
 * 
 * Events handled:
 * - payment.captured: Payment successful, update order to paid/confirmed
 * - payment.failed: Payment failed, update order to failed
 * 
 * This endpoint is idempotent - duplicate webhook calls are safely handled.
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text()
    const webhookSignature = request.headers.get('X-Razorpay-Signature')
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

    // Verify webhook signature
    if (!webhookSecret) {
      console.error('[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not configured')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    if (!webhookSignature) {
      console.error('[Razorpay Webhook] Missing X-Razorpay-Signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex')

    // Use timing-safe comparison
    const receivedBuffer = Buffer.from(webhookSignature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')

    if (receivedBuffer.length !== expectedBuffer.length) {
      console.error('[Razorpay Webhook] Signature length mismatch')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const isValid = crypto.timingSafeEqual(receivedBuffer, expectedBuffer)

    if (!isValid) {
      console.error('[Razorpay Webhook] Invalid signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse webhook payload
    let payload: any
    try {
      payload = JSON.parse(body)
    } catch (error) {
      console.error('[Razorpay Webhook] Invalid JSON payload:', error)
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    const { event, payload: eventPayload } = payload

    if (!event || !eventPayload) {
      console.error('[Razorpay Webhook] Missing event or payload')
      return NextResponse.json(
        { error: 'Missing event or payload' },
        { status: 400 }
      )
    }

    console.log('[Razorpay Webhook] Received event:', {
      event,
      payment_id: eventPayload.payment?.entity?.id,
      order_id: eventPayload.payment?.entity?.order_id,
      timestamp: new Date().toISOString(),
    })

    // Get Supabase client
    let supabase
    try {
      supabase = createServerSupabaseClient()
    } catch (supabaseError: any) {
      console.error('[Razorpay Webhook] Failed to create Supabase client:', supabaseError)
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      )
    }

    // Handle different events
    if (event === 'payment.captured') {
      return await handlePaymentCaptured(supabase, eventPayload)
    } else if (event === 'payment.failed') {
      return await handlePaymentFailed(supabase, eventPayload)
    } else {
      // Acknowledge other events but don't process them
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Razorpay Webhook] Unhandled event:', event)
      }
      return NextResponse.json({ received: true })
    }
  } catch (error: any) {
    console.error('[Razorpay Webhook] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Handle payment.captured event
 * Updates order to paid/confirmed status
 */
async function handlePaymentCaptured(supabase: any, eventPayload: any) {
  try {
    const payment = eventPayload.payment?.entity
    if (!payment) {
      console.error('[Razorpay Webhook] Missing payment entity in payload')
      return NextResponse.json(
        { error: 'Missing payment entity' },
        { status: 400 }
      )
    }

    const paymentId = payment.id
    const orderId = payment.order_id

    if (!paymentId) {
      console.error('[Razorpay Webhook] Missing payment_id')
      return NextResponse.json(
        { error: 'Missing payment_id' },
        { status: 400 }
      )
    }

    // Find order by payment_id first (most reliable for captured payments)
    let orders: any[] | null = null
    let findError: any = null

    if (paymentId) {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, payment_status, status, status_history')
        .eq('payment_id', paymentId)
        .limit(1)

      orders = data
      findError = error
    }

    // If not found by payment_id and we have order_id, search by admin_notes
    // This handles cases where payment_id might not be set yet
    if ((!orders || orders.length === 0) && orderId) {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, payment_status, status, status_history')
        .ilike('admin_notes', `%Razorpay Order ID: ${orderId}%`)
        .limit(1)

      orders = data
      findError = error
    }

    if (findError) {
      console.error('[Razorpay Webhook] Error finding order:', findError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (!orders || orders.length === 0) {
      console.warn('[Razorpay Webhook] Order not found for payment:', {
        payment_id: paymentId,
        razorpay_order_id: orderId,
      })
      // Return success to acknowledge webhook (idempotent - order might not exist yet)
      return NextResponse.json({ received: true, message: 'Order not found' })
    }

    const order = orders[0]

    // Idempotency check: If order is already paid/confirmed, acknowledge and return
    if (order.payment_status === 'paid' && order.status === 'confirmed') {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Razorpay Webhook] Order already confirmed (idempotent):', order.id)
      }
      return NextResponse.json({ 
        received: true, 
        message: 'Order already confirmed',
        order_id: order.id 
      })
    }

    // Update status history
    const statusHistory = Array.isArray(order.status_history) ? [...order.status_history] : []
    statusHistory.push({
      status: 'confirmed',
      timestamp: new Date().toISOString(),
      note: `Payment captured via Razorpay webhook (Payment ID: ${paymentId})`,
    })

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_id: paymentId,
        payment_date: new Date().toISOString(),
        status: 'confirmed',
        status_history: statusHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select('id, order_number')
      .single()

    if (updateError) {
      console.error('[Razorpay Webhook] Error updating order:', updateError)
      return NextResponse.json(
        { error: 'Failed to update order', message: updateError.message },
        { status: 500 }
      )
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Razorpay Webhook] Order confirmed successfully:', {
        order_id: updatedOrder.id,
        order_number: updatedOrder.order_number,
        payment_id: paymentId,
      })
    }

    return NextResponse.json({
      received: true,
      order_id: updatedOrder.id,
      order_number: updatedOrder.order_number,
    })
  } catch (error: any) {
    console.error('[Razorpay Webhook] Error handling payment.captured:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Handle payment.failed event
 * Updates order to failed status
 */
async function handlePaymentFailed(supabase: any, eventPayload: any) {
  try {
    const payment = eventPayload.payment?.entity
    if (!payment) {
      console.error('[Razorpay Webhook] Missing payment entity in payload')
      return NextResponse.json(
        { error: 'Missing payment entity' },
        { status: 400 }
      )
    }

    const paymentId = payment.id
    const orderId = payment.order_id
    const errorDescription = payment.error_description || payment.error_reason || 'Payment failed'

    if (!paymentId) {
      console.error('[Razorpay Webhook] Missing payment_id')
      return NextResponse.json(
        { error: 'Missing payment_id' },
        { status: 400 }
      )
    }

    // Find order by payment_id first (most reliable for failed payments)
    let orders: any[] | null = null
    let findError: any = null

    if (paymentId) {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, payment_status, status, status_history')
        .eq('payment_id', paymentId)
        .limit(1)

      orders = data
      findError = error
    }

    // If not found by payment_id and we have order_id, search by admin_notes
    // This handles cases where payment_id might not be set yet
    if ((!orders || orders.length === 0) && orderId) {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, payment_status, status, status_history')
        .ilike('admin_notes', `%Razorpay Order ID: ${orderId}%`)
        .limit(1)

      orders = data
      findError = error
    }

    if (findError) {
      console.error('[Razorpay Webhook] Error finding order:', findError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (!orders || orders.length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Razorpay Webhook] Order not found for payment:', {
          payment_id: paymentId,
          razorpay_order_id: orderId,
        })
      }
      // Return success to acknowledge webhook (idempotent - order might not exist yet)
      return NextResponse.json({ received: true, message: 'Order not found' })
    }

    const order = orders[0]

    // Idempotency check: If order is already marked as failed, acknowledge and return
    if (order.payment_status === 'failed') {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Razorpay Webhook] Order already marked as failed (idempotent):', order.id)
      }
      return NextResponse.json({ 
        received: true, 
        message: 'Order already marked as failed',
        order_id: order.id 
      })
    }

    // Don't update if order is already confirmed/paid (payment might have succeeded after failure)
    if (order.payment_status === 'paid' && order.status === 'confirmed') {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Razorpay Webhook] Order already confirmed, ignoring failure event:', order.id)
      }
      return NextResponse.json({ 
        received: true, 
        message: 'Order already confirmed, ignoring failure',
        order_id: order.id 
      })
    }

    // Update status history
    const statusHistory = Array.isArray(order.status_history) ? [...order.status_history] : []
    statusHistory.push({
      status: 'pending',
      timestamp: new Date().toISOString(),
      note: `Payment failed via Razorpay webhook: ${errorDescription} (Payment ID: ${paymentId})`,
    })

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'failed',
        status: 'pending',
        status_history: statusHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select('id, order_number')
      .single()

    if (updateError) {
      console.error('[Razorpay Webhook] Error updating order:', updateError)
      return NextResponse.json(
        { error: 'Failed to update order', message: updateError.message },
        { status: 500 }
      )
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Razorpay Webhook] Order marked as failed:', {
        order_id: updatedOrder.id,
        order_number: updatedOrder.order_number,
        payment_id: paymentId,
        error: errorDescription,
      })
    }

    return NextResponse.json({
      received: true,
      order_id: updatedOrder.id,
      order_number: updatedOrder.order_number,
    })
  } catch (error: any) {
    console.error('[Razorpay Webhook] Error handling payment.failed:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

