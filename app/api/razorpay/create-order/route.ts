import { NextRequest, NextResponse } from 'next/server'
import { getRazorpayClient } from '@/lib/razorpay/server'

/**
 * POST /api/razorpay/create-order
 * 
 * Creates a Razorpay order using the official Node SDK.
 * 
 * Request body:
 * - amountCents or amountPaise: number (amount in paise, required)
 * - currency: string (defaults to 'INR')
 * - receipt: string (optional)
 * - notes: object (optional)
 * 
 * Response:
 * - orderId: string
 * - amount: number (in paise)
 * - currency: string
 * 
 * This route uses RAZORPAY_KEY_SECRET which should NEVER be exposed to the client.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amountCents, amountPaise, currency = 'INR', receipt, notes } = body

    // Extract amount from either amountCents or amountPaise (both should be in paise)
    const amount = amountCents ?? amountPaise

    // Validate amount
    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Amount is required. Provide either amountCents or amountPaise (in paise)' },
        { status: 400 }
      )
    }

    if (typeof amount !== 'number' || isNaN(amount)) {
      return NextResponse.json(
        { error: 'Amount must be a valid number' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Validate currency
    if (typeof currency !== 'string' || currency.trim() === '') {
      return NextResponse.json(
        { error: 'Currency must be a non-empty string' },
        { status: 400 }
      )
    }

    // Get Razorpay client (server-side only)
    const razorpay = getRazorpayClient()

    // Create order using official Razorpay Node SDK
    // Amount is already in paise, so we round it to ensure it's an integer
    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency: currency.toUpperCase(),
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {},
    })

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    })
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error)

    // Handle Razorpay API errors
    if (error.statusCode) {
      return NextResponse.json(
        {
          error: 'Failed to create Razorpay order',
          message: error.description || error.message || 'Razorpay API error',
        },
        { status: error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 400 }
      )
    }

    // Handle validation errors from our code
    if (error instanceof Error && error.message.includes('must only be called on the server')) {
      return NextResponse.json(
        { error: 'Server configuration error', message: error.message },
        { status: 500 }
      )
    }

    // Handle missing environment variables
    if (error instanceof Error && error.message.includes('environment variables')) {
      return NextResponse.json(
        {
          error: 'Server configuration error',
          message:
            'Razorpay environment variables are not configured. Please ensure .env.local contains NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, then restart your dev server.',
        },
        { status: 500 }
      )
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

