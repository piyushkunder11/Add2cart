# Admin Orders Implementation

## Summary

This document explains the implementation of the Admin Orders page and the fix for why admins couldn't see latest orders.

## Issue Identified

The problem was with **Row Level Security (RLS) policies** on the `orders` table. The existing policies were:
1. Allowing public to view orders (for order confirmation pages)
2. Allowing authenticated users to view their own orders (by email/user_id)
3. **BUT** not explicitly allowing admins to view ALL orders

Even though the API route uses the service role key (which bypasses RLS), if the service role key isn't configured or if the client-side code tries to access orders directly, the RLS policies would block admin access.

## Solution

### 1. Created Admin Orders Page (`/admin/orders`)
- **Location**: `app/admin/orders/page.tsx`
- **Features**:
  - Lists all orders sorted by `created_at DESC` (newest first)
  - Shows: Order Number, Created time, Customer name/email/phone, Address summary, Total amount, Payment status, Order status, Items summary
  - Status update dropdown with auto-save on change
  - Error handling with clear UI messages
  - Admin-only access (redirects non-admins to home)

### 2. Added Orders to Account Dropdown
- **Location**: `components/home/Navbar.tsx`
- **Changes**:
  - Added "Orders" menu item in Account dropdown (desktop and mobile)
  - Only visible to admins (uses `useIsAdmin` hook)
  - Links to `/admin/orders`

### 3. Updated API Routes
- **Location**: `app/api/admin/orders/route.ts`
- **Changes**:
  - Added limit to prevent huge queries (1000 orders max)
  - Ensured proper admin authentication check
  - Uses service role key (bypasses RLS) via `createServerSupabaseClient()`

### 4. Fixed RLS Policies
- **Location**: `supabase_admin_orders_rls_fix.sql`
- **Changes**:
  - Created explicit policy: "Admins can view all orders"
  - Allows `is_admin_or_staff(auth.uid())` to view ALL orders
  - Maintains existing policies for users to view their own orders
  - Keeps public access for order confirmation pages

## Files Created/Modified

### Created:
1. `app/admin/orders/page.tsx` - Admin orders page
2. `supabase_admin_orders_rls_fix.sql` - SQL migration for RLS policies

### Modified:
1. `components/home/Navbar.tsx` - Added Orders menu item for admins
2. `app/api/admin/orders/route.ts` - Added query limit and improved comments

## SQL Migration Instructions

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `supabase_admin_orders_rls_fix.sql`
3. Run the script
4. Verify policies with the verification query at the end of the script

## How It Works

### Admin Authentication Flow:
1. User logs in → `useIsAdmin` hook checks `user_roles` table
2. If `role = 'admin'` → Shows "Orders" in Account dropdown
3. Click "Orders" → Navigates to `/admin/orders`
4. Page checks admin status → Fetches orders from `/api/admin/orders`
5. API route:
   - Verifies admin via `user_roles` table
   - Uses service role key (bypasses RLS)
   - Returns all orders sorted by `created_at DESC`

### Status Update Flow:
1. Admin selects new status from dropdown
2. Auto-saves via `PUT /api/admin/orders/[id]`
3. Updates `status` and `status_history` in database
4. UI updates optimistically
5. Error handling shows clear messages if update fails

## Security Considerations

1. **Server-Side Authentication**: All admin checks happen server-side in API routes
2. **Service Role Key**: API routes use `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS
3. **RLS Policies**: Even if service role key isn't used, RLS policies now explicitly allow admin access
4. **Client-Side Protection**: Page redirects non-admins, but this is just UX - real security is server-side

## Testing Checklist

- [ ] Admin can see "Orders" in Account dropdown
- [ ] Non-admin cannot see "Orders" option
- [ ] Admin can access `/admin/orders` page
- [ ] Non-admin is redirected from `/admin/orders`
- [ ] Orders list shows latest orders first
- [ ] Status update dropdown works and saves changes
- [ ] Error messages display correctly
- [ ] RLS policies allow admin to view all orders

## Environment Variables Required

Ensure these are set in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Important for admin operations
```

## Troubleshooting

### Admin still can't see orders:
1. Check if `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
2. Verify RLS policies were applied (run verification query)
3. Check browser console for API errors
4. Verify admin user has `role = 'admin'` in `user_roles` table

### Status updates not saving:
1. Check browser console for errors
2. Verify API route is accessible
3. Check Supabase logs for RLS policy violations
4. Ensure `is_admin_or_staff()` function exists in database

### Orders not showing in correct order:
- Orders are sorted by `created_at DESC` in the API route
- If orders appear in wrong order, check `created_at` timestamps in database
