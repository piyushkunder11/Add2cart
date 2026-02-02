import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServerSupabaseClientWithAuth } from '@/lib/supabase/server'

/**
 * GET /api/admin/orders/[id]
 * Get a single order by ID (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle async params in Next.js 14+
    const resolvedParams = await Promise.resolve(params)
    const orderId = resolvedParams.id

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

    // Check if user is admin
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

    // Use service role key for admin operations
    const supabase = createServerSupabaseClient()

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })
  } catch (error: any) {
    console.error('[Admin Orders API] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/orders/[id]
 * Update an order (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle async params in Next.js 14+
    const resolvedParams = await Promise.resolve(params)
    const orderId = resolvedParams.id

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

    // Check if user is admin
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

    // Use service role key for admin operations
    const supabase = createServerSupabaseClient()

    const body = await request.json()
    let { status, tracking_number, shipping_provider, admin_notes } = body
    
    // Normalize status to lowercase to avoid case sensitivity issues
    if (status && typeof status === 'string') {
      status = status.toLowerCase().trim()
    }

    console.log('[Admin Orders API] Updating order:', { orderId, status, updateData: body })

    // Get current order to update status_history
    const { data: currentOrderData, error: fetchError } = await supabase
      .from('orders')
      .select('status_history, status')
      .eq('id', orderId)
      .maybeSingle()

    if (fetchError) {
      console.error('[Admin Orders API] Error fetching order:', fetchError)
      return NextResponse.json(
        {
          error: 'Failed to fetch order',
          message: fetchError.message,
        },
        { status: 500 }
      )
    }

    if (!currentOrderData) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const currentOrder = currentOrderData
    console.log('[Admin Orders API] Current order status:', { currentStatus: currentOrder.status, newStatus: status })

    // Ensure status_history is an array
    let statusHistory: any[] = []
    if (Array.isArray(currentOrder.status_history)) {
      statusHistory = [...currentOrder.status_history]
    } else if (currentOrder.status_history && typeof currentOrder.status_history === 'object') {
      try {
        statusHistory = Array.isArray(currentOrder.status_history) 
          ? currentOrder.status_history 
          : [currentOrder.status_history]
      } catch (e) {
        console.warn('[Admin Orders API] Error parsing status_history:', e)
        statusHistory = []
      }
    }
    
    // Add status change to history if status is being updated and is different
    if (status && status !== currentOrder.status) {
      statusHistory.push({
        status,
        timestamp: new Date().toISOString(),
        note: `Status updated to ${status}`,
      })
      console.log('[Admin Orders API] Adding status change to history:', { from: currentOrder.status, to: status })
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // Always update status if provided, even if it's the same (to ensure update happens)
    if (status !== undefined && status !== null) {
      updateData.status = status
      updateData.status_history = statusHistory
      
      // Set shipped_at if status is shipped
      if (status === 'shipped' && !statusHistory.some((h: any) => h.status === 'shipped')) {
        updateData.shipped_at = new Date().toISOString()
      }
      
      // Set delivered_at if status is delivered
      if (status === 'delivered' && !statusHistory.some((h: any) => h.status === 'delivered')) {
        updateData.delivered_at = new Date().toISOString()
      }
      
      console.log('[Admin Orders API] Update data prepared:', { updateData })
    }

    if (tracking_number !== undefined) {
      updateData.tracking_number = tracking_number || null
    }

    if (shipping_provider !== undefined) {
      updateData.shipping_provider = shipping_provider || null
    }

    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes || null
    }

    console.log('[Admin Orders API] Executing update with data:', JSON.stringify(updateData, null, 2))
    
    // Update the order in Supabase
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (updateError) {
      console.error('[Admin Orders API] Error updating order:', {
        error: updateError,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
        orderId,
        updateData,
      })
      return NextResponse.json(
        {
          error: 'Failed to update order',
          message: updateError.message || 'Unknown error',
          details: updateError.details,
          hint: updateError.hint,
        },
        { status: 500 }
      )
    }

    console.log('[Admin Orders API] Update successful, fetching updated order...')

    // Fetch the updated order to ensure we return all data and verify it was saved
    const { data: updatedOrderData, error: fetchUpdatedError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (fetchUpdatedError) {
      console.error('[Admin Orders API] Error fetching updated order:', {
        error: fetchUpdatedError,
        message: fetchUpdatedError.message,
        orderId,
      })
      return NextResponse.json(
        {
          error: 'Failed to fetch updated order',
          message: fetchUpdatedError.message || 'Unknown error',
        },
        { status: 500 }
      )
    }

    if (!updatedOrderData) {
      console.error('[Admin Orders API] Updated order not found:', { orderId })
      return NextResponse.json(
        {
          error: 'Failed to update order',
          message: 'Updated order not found',
        },
        { status: 500 }
      )
    }

    const updatedOrder = updatedOrderData
    console.log('[Admin Orders API] Order updated successfully:', { orderId, status: updatedOrder.status })

    return NextResponse.json({ order: updatedOrder })
  } catch (error: any) {
    console.error('[Admin Orders API] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


