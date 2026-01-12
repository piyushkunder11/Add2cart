import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getRazorpayKeySecret } from '@/lib/razorpay/env-validation'

/**
 * POST /api/razorpay/verify-payment
 * 
 * Verifies a Razorpay payment signature to ensure the payment is legitimate.
 * 
 * Request body:
 * - razorpay_order_id: string (required)
 * - razorpay_payment_id: string (required)
 * - razorpay_signature: string (required)
 * 
 * Response:
 * - ok: boolean (true if signature is valid, false otherwise)
 * 
 * This route uses RAZORPAY_KEY_SECRET which should NEVER be exposed to the client.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body

    // Validate required fields
    if (!razorpay_order_id || typeof razorpay_order_id !== 'string' || razorpay_order_id.trim() === '') {
      return NextResponse.json(
        {
          ok: false,
          error: 'razorpay_order_id is required and must be a non-empty string',
        },
        { status: 400 }
      )
    }

    if (!razorpay_payment_id || typeof razorpay_payment_id !== 'string' || razorpay_payment_id.trim() === '') {
      return NextResponse.json(
        {
          ok: false,
          error: 'razorpay_payment_id is required and must be a non-empty string',
        },
        { status: 400 }
      )
    }

    if (!razorpay_signature || typeof razorpay_signature !== 'string' || razorpay_signature.trim() === '') {
      return NextResponse.json(
        {
          ok: false,
          error: 'razorpay_signature is required and must be a non-empty string',
        },
        { status: 400 }
      )
    }

    // Get the secret key (server-side only)
    const keySecret = getRazorpayKeySecret()

    // Create the message string for signature verification
    // Format: order_id|payment_id
    const message = `${razorpay_order_id}|${razorpay_payment_id}`

    // Generate HMAC SHA256 hash
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(message)
      .digest('hex')

    // Use timing-safe comparison to prevent timing attacks
    // Both signatures are hex strings, so compare them directly
    // Convert to buffers for timing-safe comparison
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
    const receivedBuffer = Buffer.from(razorpay_signature, 'utf8')

    // timingSafeEqual requires buffers of the same length
    if (expectedBuffer.length !== receivedBuffer.length) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid payment signature',
        },
        { status: 400 }
      )
    }

    const isValid = crypto.timingSafeEqual(expectedBuffer, receivedBuffer)

    if (isValid) {
      return NextResponse.json({
        ok: true,
      })
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid payment signature',
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error)

    // Handle validation errors from our code
    if (error instanceof Error && error.message.includes('must only be called on the server')) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Server configuration error',
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Handle missing environment variables
    if (error instanceof Error && error.message.includes('environment variables')) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Server configuration error',
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Handle crypto errors
    if (error instanceof Error && (error.message.includes('crypto') || error.message.includes('HMAC'))) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Signature verification failed',
          message: 'An error occurred during signature verification',
        },
        { status: 500 }
      )
    }

    // Generic server error
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

