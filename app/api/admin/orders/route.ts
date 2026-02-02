import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServerSupabaseClientWithAuth } from '@/lib/supabase/server'

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
    // Create client with anon key to read user session
    const { client: authClient, accessToken } = createServerSupabaseClientWithAuth(request)
    
    // Get authenticated user using access token if available
    let user = null
    if (accessToken) {
      const { data: { user: userData }, error: authError } = await authClient.auth.getUser(accessToken)
      if (authError) {
        return NextResponse.json(
          { error: 'Unauthorized - Invalid session' },
          { status: 401 }
        )
      }
      user = userData
    } else {
      // Try without token (might work if cookies are set properly)
      const { data: { user: userData }, error: authError } = await authClient.auth.getUser()
      if (authError || !userData) {
        return NextResponse.json(
          { error: 'Unauthorized - Please log in' },
          { status: 401 }
        )
      }
      user = userData
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Check if user is admin using auth client (with anon key, respects RLS)
    const { data: roleData } = await authClient
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

    // Now use service role key client for admin operations (bypasses RLS)
    const supabase = createServerSupabaseClient()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const payment_status = searchParams.get('payment_status')

    // Use service role key to bypass RLS for admin operations
    // Filter to show only orders that are paid OR confirmed (so admin can ship them)
    // This ensures admins only see orders ready for shipping
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000) // Limit to prevent huge queries

    // Base filter: only show paid or confirmed orders
    // Using .or() to match orders where payment_status='paid' OR status='confirmed'
    query = query.or('payment_status.eq.paid,status.eq.confirmed')

    // Additional filters can be applied on top of the base filter
    // These will narrow down the results within the paid/confirmed set
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

    // Log for debugging
    console.log(`[Admin Orders API] Fetched ${orders?.length || 0} orders (paid or confirmed)`)

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


