-- Add2Cart Storage RLS Policies for product-images bucket
-- Supabase Storage SQL Script
-- Run this after creating the product-images bucket

-- ============================================
-- STORAGE POLICIES FOR product-images BUCKET
-- ============================================

-- Policy 1: Public READ (SELECT) - Anyone can view/download images
DROP POLICY IF EXISTS "Public can read product images" ON storage.objects;
CREATE POLICY "Public can read product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Policy 2: Public UPLOAD (INSERT) - allow uploads from client (loosened)
DROP POLICY IF EXISTS "Public can upload product images" ON storage.objects;
CREATE POLICY "Public can upload product images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'product-images');

-- Policy 3: Public UPDATE (optional replace)
DROP POLICY IF EXISTS "Public can update product images" ON storage.objects;
CREATE POLICY "Public can update product images"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Policy 4: Public DELETE
DROP POLICY IF EXISTS "Public can delete product images" ON storage.objects;
CREATE POLICY "Public can delete product images"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'product-images');

