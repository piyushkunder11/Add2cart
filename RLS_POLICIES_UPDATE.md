# RLS Policies Update for Orders

## Changes Made

### 1. **Orders INSERT Policy** ✅
- **Status**: Already correct - allows public inserts
- **Policy**: "Anyone can create orders"
- **Access**: `TO public` with `WITH CHECK (true)`
- **Purpose**: Allows anonymous users (guests) to create orders during checkout

### 2. **Orders SELECT Policy** ✅ Updated
- **Added**: Policy for authenticated users to view their own orders
- **Added**: Policy for public to view orders (needed for order confirmation page)
- **Note**: Order IDs are UUIDs which provide basic security (hard to guess)

### 3. **Orders UPDATE/DELETE Policies** ✅
- **Status**: Already correct - admin/staff only
- **Access**: Only authenticated admin/staff users

## How to Apply

### Step 1: Run the Schema (if not already done)
```sql
-- Run in Supabase SQL Editor
-- File: supabase_schema.sql
```

### Step 2: Run the RLS Policies
```sql
-- Run in Supabase SQL Editor
-- File: supabase_rls_policies.sql
```

### Step 3: Verify Policies (Optional)
```sql
-- Run in Supabase SQL Editor
-- File: supabase_rls_policies_verification.sql
```

## Important Notes

### Service Role Key vs Anon Key

1. **Service Role Key** (Recommended for API routes):
   - **Bypasses RLS entirely**
   - Use `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
   - Best for server-side operations
   - More secure for order creation

2. **Anon Key**:
   - **Subject to RLS policies**
   - Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
   - Works with the updated policies
   - Less secure but still functional

### Recommended Setup

For production, use **Service Role Key** in your API routes:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

This bypasses RLS and ensures order creation always works, regardless of policies.

## Testing

After applying the policies, test order creation:

1. Make a test payment
2. Check server logs for any RLS errors
3. Verify order appears in Supabase dashboard

## Troubleshooting

### If orders still fail to create:

1. **Check RLS is enabled**:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'orders';
   ```
   Should show `rowsecurity = true`

2. **Check policies exist**:
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'orders';
   ```
   Should include "Anyone can create orders"

3. **Use Service Role Key**:
   - Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
   - Restart dev server
   - Service role key bypasses RLS

4. **Check Supabase logs**:
   - Go to Supabase Dashboard → Logs
   - Look for any policy violation errors

## Security Considerations

- **INSERT**: Public access is needed for checkout (guests can order)
- **SELECT**: Public access allows viewing orders by ID (UUIDs provide security)
- **UPDATE/DELETE**: Restricted to admin/staff only

For additional security, consider:
- Adding rate limiting to order creation
- Validating order data in API routes before inserting
- Using service role key for server-side operations

