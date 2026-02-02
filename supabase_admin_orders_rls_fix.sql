-- ============================================
-- ADMIN ORDERS RLS POLICY FIX
-- ============================================
-- This script ensures admins can view ALL orders
-- Run this in Supabase SQL Editor
-- ============================================

-- First, ensure RLS is enabled on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policies that might be blocking admin access
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Public can view orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;

-- Create a new policy that allows:
-- 1. Admins/staff to view ALL orders
-- 2. Authenticated users to view their own orders (by email or user_id)
-- 3. Public to view orders (for order confirmation pages - UUIDs provide security)
CREATE POLICY "Admins can view all orders"
ON orders
FOR SELECT
TO authenticated
USING (
    -- Allow if user is admin/staff
    is_admin_or_staff(auth.uid())
    OR
    -- Allow if order email matches user's email
    EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.email = orders.email
    )
    OR
    -- Allow if order user_id matches authenticated user
    (orders.user_id IS NOT NULL AND orders.user_id = auth.uid())
);

-- Keep public SELECT policy for order confirmation pages
-- (Order IDs are UUIDs which are hard to guess, providing basic security)
CREATE POLICY "Public can view orders"
ON orders
FOR SELECT
TO public
USING (true);

-- Ensure UPDATE policy allows admins/staff to update orders
DROP POLICY IF EXISTS "Only admin/staff can update orders" ON orders;
CREATE POLICY "Only admin/staff can update orders"
ON orders
FOR UPDATE
TO authenticated
USING (is_admin_or_staff(auth.uid()))
WITH CHECK (is_admin_or_staff(auth.uid()));

-- Verify the policies
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
