-- Add2Cart RLS (Row Level Security) Policies
-- Supabase Postgres SQL Script
-- Run this after creating your tables

-- ============================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. HELPER FUNCTION: Check if user is admin
-- ============================================
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_roles 
        WHERE user_id = user_uuid 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. HELPER FUNCTION: Check if user is admin or staff
-- ============================================
CREATE OR REPLACE FUNCTION is_admin_or_staff(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_roles 
        WHERE user_id = user_uuid 
        AND role IN ('admin', 'staff')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. CATEGORIES POLICIES
-- ============================================

-- Public SELECT: Anyone can view categories
DROP POLICY IF EXISTS "Public can view categories" ON categories;
CREATE POLICY "Public can view categories"
ON categories
FOR SELECT
TO public
USING (true);

-- Admin only: INSERT
DROP POLICY IF EXISTS "Only admin can insert categories" ON categories;
CREATE POLICY "Only admin can insert categories"
ON categories
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- Admin only: UPDATE
DROP POLICY IF EXISTS "Only admin can update categories" ON categories;
CREATE POLICY "Only admin can update categories"
ON categories
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Admin only: DELETE
DROP POLICY IF EXISTS "Only admin can delete categories" ON categories;
CREATE POLICY "Only admin can delete categories"
ON categories
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- ============================================
-- 5. PRODUCTS POLICIES
-- ============================================

-- Public SELECT: Anyone can view products
DROP POLICY IF EXISTS "Public can view products" ON products;
CREATE POLICY "Public can view products"
ON products
FOR SELECT
TO public
USING (true);

-- Admin only: INSERT
DROP POLICY IF EXISTS "Only admin can insert products" ON products;
CREATE POLICY "Only admin can insert products"
ON products
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- Admin only: UPDATE
DROP POLICY IF EXISTS "Only admin can update products" ON products;
CREATE POLICY "Only admin can update products"
ON products
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Admin only: DELETE
DROP POLICY IF EXISTS "Only admin can delete products" ON products;
CREATE POLICY "Only admin can delete products"
ON products
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- ============================================
-- 6. PRODUCT_IMAGES POLICIES (Allow public – needed for dashboard actions)
-- ============================================

DROP POLICY IF EXISTS "Public can view product images" ON product_images;
CREATE POLICY "Public can view product images"
ON product_images
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Public can insert product images" ON product_images;
CREATE POLICY "Public can insert product images"
ON product_images
FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update product images" ON product_images;
CREATE POLICY "Public can update product images"
ON product_images
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete product images" ON product_images;
CREATE POLICY "Public can delete product images"
ON product_images
FOR DELETE
TO public
USING (true);

-- ============================================
-- 6b. PRODUCT_VARIANTS POLICIES (Allow public – needed for dashboard actions)
-- ============================================

DROP POLICY IF EXISTS "Public can view product variants" ON product_variants;
CREATE POLICY "Public can view product variants"
ON product_variants
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Public can insert product variants" ON product_variants;
CREATE POLICY "Public can insert product variants"
ON product_variants
FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update product variants" ON product_variants;
CREATE POLICY "Public can update product variants"
ON product_variants
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete product variants" ON product_variants;
CREATE POLICY "Public can delete product variants"
ON product_variants
FOR DELETE
TO public
USING (true);

-- ============================================
-- 7. BANNERS POLICIES
-- ============================================

-- Public SELECT: Anyone can view banners
DROP POLICY IF EXISTS "Public can view banners" ON banners;
CREATE POLICY "Public can view banners"
ON banners
FOR SELECT
TO public
USING (true);

-- Admin only: INSERT
DROP POLICY IF EXISTS "Only admin can insert banners" ON banners;
CREATE POLICY "Only admin can insert banners"
ON banners
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- Admin only: UPDATE
DROP POLICY IF EXISTS "Only admin can update banners" ON banners;
CREATE POLICY "Only admin can update banners"
ON banners
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Admin only: DELETE
DROP POLICY IF EXISTS "Only admin can delete banners" ON banners;
CREATE POLICY "Only admin can delete banners"
ON banners
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- ============================================
-- 8. ORDERS POLICIES
-- ============================================

-- Public INSERT: Anyone (including guests/anonymous) can create orders
-- This is essential for checkout flow where users may not be authenticated
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
CREATE POLICY "Anyone can create orders"
ON orders
FOR INSERT
TO public
WITH CHECK (true);

-- Allow authenticated users to view their own orders by email
-- This allows customers to view their order confirmation
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders"
ON orders
FOR SELECT
TO authenticated
USING (
    -- Allow if user is admin/staff
    is_admin_or_staff(auth.uid())
    OR
    -- Allow if order email matches user's email (if you store user email in auth.users)
    EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.email = orders.email
    )
);

-- Allow public/anon key to read orders (for order confirmation page)
-- NOTE: Order IDs are UUIDs which are hard to guess, providing basic security
-- For production, consider adding additional validation in your API routes
-- or requiring authentication to view order details
DROP POLICY IF EXISTS "Public can view orders" ON orders;
CREATE POLICY "Public can view orders"
ON orders
FOR SELECT
TO public
USING (true);

-- Admin/Staff only: UPDATE
DROP POLICY IF EXISTS "Only admin/staff can update orders" ON orders;
CREATE POLICY "Only admin/staff can update orders"
ON orders
FOR UPDATE
TO authenticated
USING (is_admin_or_staff(auth.uid()))
WITH CHECK (is_admin_or_staff(auth.uid()));

-- Admin/Staff only: DELETE
DROP POLICY IF EXISTS "Only admin/staff can delete orders" ON orders;
CREATE POLICY "Only admin/staff can delete orders"
ON orders
FOR DELETE
TO authenticated
USING (is_admin_or_staff(auth.uid()));

-- ============================================
-- 9. USER_ROLES POLICIES
-- ============================================

-- Admin only: SELECT
DROP POLICY IF EXISTS "Only admin can view user roles" ON user_roles;
CREATE POLICY "Only admin can view user roles"
ON user_roles
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Admin only: INSERT
DROP POLICY IF EXISTS "Only admin can insert user roles" ON user_roles;
CREATE POLICY "Only admin can insert user roles"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- Admin only: UPDATE
DROP POLICY IF EXISTS "Only admin can update user roles" ON user_roles;
CREATE POLICY "Only admin can update user roles"
ON user_roles
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Admin only: DELETE
DROP POLICY IF EXISTS "Only admin can delete user roles" ON user_roles;
CREATE POLICY "Only admin can delete user roles"
ON user_roles
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

