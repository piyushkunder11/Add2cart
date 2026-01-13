import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// This route reads searchParams and depends on runtime data, so force it to be dynamic
export const dynamic = 'force-dynamic'

/**
 * GET /api/orders
 * 
 * Fetches orders for the authenticated user or by email
 * 
 * Query parameters:
 * - email: string (optional) - filter orders by email
 * 
 * Response:
 * - orders: array of order objects
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')
    const userId = searchParams.get('user_id')

    if (!email && !userId) {
      return NextResponse.json(
        { error: 'Email or user_id parameter is required' },
        { status: 400 }
      )
    }

    let supabase
    try {
      supabase = createServerSupabaseClient()
    } catch (supabaseError: any) {
      console.error('[API Orders] Failed to create Supabase client:', supabaseError)
      return NextResponse.json(
        {
          error: 'Server configuration error: Supabase is not configured',
          message: supabaseError?.message || 'Missing Supabase environment variables',
        },
        { status: 500 }
      )
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[API Orders] Fetching orders:', { userId, email })
    }

    // Build query - fetch by user_id if available, otherwise by email
    // If both are provided, we'll try user_id first, then fallback to email
    let query = supabase.from('orders').select('*')

    if (userId) {
      // If user_id is provided, use it (more reliable for authenticated users)
      query = query.eq('user_id', userId)
    } else if (email) {
      // Fallback to email matching
      query = query.eq('email', email)
    }

    // Order by most recent first
    const { data: orders, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('[API Orders] Error fetching orders:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId,
        email,
      })
      return NextResponse.json(
        {
          error: 'Failed to fetch orders',
          message: error.message,
        },
        { status: 500 }
      )
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[API Orders] Found orders:', { count: orders?.length || 0, userId, email })
    }

    // If no orders found with user_id, try email as fallback (for orders placed before user_id was added)
    if ((!orders || orders.length === 0) && userId && email) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[API Orders] No orders found with user_id, trying email fallback')
      }
      const { data: emailOrders, error: emailError } = await supabase
        .from('orders')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })

      if (!emailError && emailOrders && emailOrders.length > 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[API Orders] Found orders by email:', { count: emailOrders.length })
        }
        return NextResponse.json({
          orders: emailOrders,
        })
      }
    }

    return NextResponse.json({
      orders: orders || [],
    })
  } catch (error: any) {
    console.error('[API Orders] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

