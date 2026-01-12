-- ============================================
-- RLS POLICIES VERIFICATION SCRIPT
-- Run this to verify your RLS policies are set up correctly
-- ============================================

-- Check if RLS is enabled on orders table
SELECT 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'orders';

-- List all policies on orders table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- Test if public can insert (should return true if policy works)
-- This query checks if the policy exists and allows public inserts
SELECT 
    EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'orders' 
        AND policyname = 'Anyone can create orders'
        AND cmd = 'INSERT'
        AND 'public' = ANY(roles)
    ) as can_public_insert;

-- Check if generate_order_number function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'generate_order_number';

-- Verify orders table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'orders'
ORDER BY ordinal_position;

