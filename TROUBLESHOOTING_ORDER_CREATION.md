# Troubleshooting "Failed to create order" Error

## Common Causes

### 1. Missing Supabase Environment Variables

The order creation requires Supabase to be configured. Add these to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Optional but recommended
```

**Where to find these:**
1. Go to your Supabase project dashboard
2. Settings → API
3. Copy the "Project URL" and "anon public" key
4. For service role key: Copy the "service_role" key (keep this secret!)

### 2. Supabase Database Not Set Up

Make sure you've run the schema SQL file to create the `orders` table:

1. Go to Supabase Dashboard → SQL Editor
2. Run the `supabase_schema.sql` file
3. Run the `supabase_rls_policies.sql` file (if using RLS)

### 3. RLS Policies Blocking Inserts

If you're using Row Level Security (RLS), ensure the policy allows inserts:

```sql
-- Should allow public inserts
CREATE POLICY "Anyone can create orders"
ON orders
FOR INSERT
TO public
WITH CHECK (true);
```

### 4. Missing `generate_order_number()` Function

The function should be created by the schema file. If missing, run:

```sql
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_order_number TEXT;
    order_count INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO order_count
    FROM orders
    WHERE DATE(created_at) = CURRENT_DATE;
    
    new_order_number := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                       LPAD(order_count::TEXT, 5, '0');
    
    RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;
```

## How to Debug

1. **Check Server Logs**: Look at your terminal where `npm run dev` is running for detailed error messages

2. **Check Browser Console**: Open DevTools (F12) → Console tab for client-side errors

3. **Verify Environment Variables**: 
   ```bash
   # Check if variables are loaded (in your terminal)
   node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
   ```

4. **Test Supabase Connection**: Create a test API route to verify Supabase is working

## Quick Fix Steps

1. **Add Supabase env vars to `.env.local`**
2. **Restart dev server** (Ctrl+C, then `npm run dev`)
3. **Hard refresh browser** (Ctrl+Shift+R)
4. **Try payment again**

## Still Not Working?

Check the server logs for the exact error message. The improved error handling will now show:
- Specific Supabase configuration errors
- Database connection issues
- RLS permission errors
- Validation errors

