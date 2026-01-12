-- Update category slug from 'socks' to 'accessories'
-- Run this script in your Supabase SQL editor to update the database

UPDATE categories 
SET 
    slug = 'accessories',
    name = 'Accessories',
    updated_at = NOW()
WHERE slug = 'socks';

-- Verify the update
SELECT id, name, slug, display_order 
FROM categories 
WHERE slug = 'accessories' OR slug = 'socks';

