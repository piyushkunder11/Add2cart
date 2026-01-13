import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Admin orders API uses searchParams and auth; ensure it is always treated as dynamic
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/orders
 * 
 * Fetches all orders for admin with optional filters
 * Admin-only access
 * 
 * Query parameters:
 * - status: string (optional) - filter by order status
 * - payment_status: string (optional) - filter by payment status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || roleData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const payment_status = searchParams.get('payment_status')

    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (payment_status) {
      query = query.eq('payment_status', payment_status)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('[Admin Orders API] Error fetching orders:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch orders',
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      orders: orders || [],
    })
  } catch (error: any) {
    console.error('[Admin Orders API] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


