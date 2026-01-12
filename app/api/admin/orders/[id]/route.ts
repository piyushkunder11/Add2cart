import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/orders/[id]
 * Get a single order by ID (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.id)
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
  { params }: { params: { id: string } }
) {
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

    const body = await request.json()
    const { status, tracking_number, shipping_provider, admin_notes } = body

    // Get current order to update status_history
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('status_history, status')
      .eq('id', params.id)
      .single()

    if (!currentOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const statusHistory = Array.isArray(currentOrder.status_history) ? [...currentOrder.status_history] : []
    
    // Add status change to history if status is being updated
    if (status && status !== currentOrder.status) {
      statusHistory.push({
        status,
        timestamp: new Date().toISOString(),
        note: `Status updated to ${status}`,
      })
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (status !== undefined) {
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

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError || !updatedOrder) {
      console.error('[Admin Orders API] Error updating order:', updateError)
      return NextResponse.json(
        {
          error: 'Failed to update order',
          message: updateError?.message || 'Unknown error',
        },
        { status: 500 }
      )
    }

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


