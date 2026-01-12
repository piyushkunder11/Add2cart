-- Add2Cart Safe Reset and Insert Script
-- This script safely truncates tables and inserts fresh data with fixed UUIDs

-- ============================================
-- 1. TRUNCATE TABLES IN CORRECT ORDER (CASCADE)
-- ============================================
-- Disable foreign key checks temporarily for clean truncate
SET session_replication_role = 'replica';

-- Truncate in order: child tables first, then parent tables
TRUNCATE TABLE product_variants CASCADE;
TRUNCATE TABLE product_images CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE categories CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- ============================================
-- 2. INSERT TOP-LEVEL CATEGORIES (Fixed UUIDs)
-- ============================================
INSERT INTO categories (id, name, slug, parent_id, display_order, is_active) VALUES
    ('11111111-1111-1111-1111-111111111001', 'Mens', 'mens', NULL, 1, true),
    ('11111111-1111-1111-1111-111111111002', 'Womens', 'womens', NULL, 2, true),
    ('11111111-1111-1111-1111-111111111003', 'Thrift', 'thrift', NULL, 3, true),
    ('11111111-1111-1111-1111-111111111004', 'Footwear', 'footwear', NULL, 4, true),
    ('11111111-1111-1111-1111-111111111005', 'Socks', 'socks', NULL, 5, true),
    ('11111111-1111-1111-1111-111111111006', 'Best Seller', 'best-seller', NULL, 6, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ============================================
-- 3. INSERT SUBCATEGORIES (Referencing Top-Level IDs)
-- ============================================

-- Mens subcategories
INSERT INTO categories (id, name, slug, parent_id, display_order, is_active) VALUES
    ('22222222-2222-2222-2222-222222222001', 'Jackets', 'mens-jacket', '11111111-1111-1111-1111-111111111001', 1, true),
    ('22222222-2222-2222-2222-222222222002', 'Shirts', 'mens-shirts', '11111111-1111-1111-1111-111111111001', 2, true),
    ('22222222-2222-2222-2222-222222222003', 'T-Shirts', 'mens-t-shirt', '11111111-1111-1111-1111-111111111001', 3, true),
    ('22222222-2222-2222-2222-222222222004', 'Jeans', 'mens-jeans', '11111111-1111-1111-1111-111111111001', 4, true),
    ('22222222-2222-2222-2222-222222222005', 'Pants', 'mens-pants', '11111111-1111-1111-1111-111111111001', 5, true),
    ('22222222-2222-2222-2222-222222222006', 'Tracks', 'mens-tracks', '11111111-1111-1111-1111-111111111001', 6, true),
    ('22222222-2222-2222-2222-222222222007', 'Korean Outfit', 'mens-korean-outfit', '11111111-1111-1111-1111-111111111001', 7, true),
    ('22222222-2222-2222-2222-222222222008', 'Light Overshirt', 'mens-light-overshirt', '11111111-1111-1111-1111-111111111001', 8, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Womens subcategories
INSERT INTO categories (id, name, slug, parent_id, display_order, is_active) VALUES
    ('33333333-3333-3333-3333-333333333001', 'Shirts', 'womens-shirts', '11111111-1111-1111-1111-111111111002', 1, true),
    ('33333333-3333-3333-3333-333333333002', 'Tops', 'womens-tops', '11111111-1111-1111-1111-111111111002', 2, true),
    ('33333333-3333-3333-3333-333333333003', 'Jeans', 'womens-jeans', '11111111-1111-1111-1111-111111111002', 3, true),
    ('33333333-3333-3333-3333-333333333004', 'Pants', 'womens-pants', '11111111-1111-1111-1111-111111111002', 4, true),
    ('33333333-3333-3333-3333-333333333005', 'Western Outfits', 'womens-western-outfits', '11111111-1111-1111-1111-111111111002', 5, true),
    ('33333333-3333-3333-3333-333333333006', 'Kurtis', 'womens-kurti', '11111111-1111-1111-1111-111111111002', 6, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Thrift subcategories
INSERT INTO categories (id, name, slug, parent_id, display_order, is_active) VALUES
    ('44444444-4444-4444-4444-444444444001', 'Mens Jacket', 'thrift-mens-jacket', '11111111-1111-1111-1111-111111111003', 1, true),
    ('44444444-4444-4444-4444-444444444002', 'Womens Jacket', 'thrift-womens-jacket', '11111111-1111-1111-1111-111111111003', 2, true),
    ('44444444-4444-4444-4444-444444444003', 'Womens Jeans', 'thrift-womens-jeans', '11111111-1111-1111-1111-111111111003', 3, true),
    ('44444444-4444-4444-4444-444444444004', 'Womens Top', 'thrift-womens-top', '11111111-1111-1111-1111-111111111003', 4, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Best Seller subcategories
INSERT INTO categories (id, name, slug, parent_id, display_order, is_active) VALUES
    ('55555555-5555-5555-5555-555555555001', 'Racing Jacket', 'best-racing-jacket', '11111111-1111-1111-1111-111111111006', 1, true),
    ('55555555-5555-5555-5555-555555555002', 'Leather Jacket', 'best-leather-jacket', '11111111-1111-1111-1111-111111111006', 2, true),
    ('55555555-5555-5555-5555-555555555003', 'Bootcut Pant', 'best-bootcut-pant', '11111111-1111-1111-1111-111111111006', 3, true),
    ('55555555-5555-5555-5555-555555555004', 'Korean Shirt', 'best-korean-shirt', '11111111-1111-1111-1111-111111111006', 4, true),
    ('55555555-5555-5555-5555-555555555005', 'Linen Pants', 'best-linen-pants', '11111111-1111-1111-1111-111111111006', 5, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ============================================
-- 4. INSERT PRODUCTS (Referencing Category IDs)
-- ============================================

-- Product 1: Men's Racing Jacket (Best Seller)
INSERT INTO products (id, title, slug, description, price_cents, category_id, subcategory_id, in_stock, is_active, sku) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', 'Men''s Racing Jacket - Black', 'mens-racing-jacket-black', 'Premium quality racing jacket with sleek black design. Perfect for casual wear and sports activities. Features breathable fabric and modern styling.', 249900, '11111111-1111-1111-1111-111111111006', '55555555-5555-5555-5555-555555555001', true, true, 'BS-RJ-BLK-001')
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    price_cents = EXCLUDED.price_cents,
    category_id = EXCLUDED.category_id,
    subcategory_id = EXCLUDED.subcategory_id,
    in_stock = EXCLUDED.in_stock,
    is_active = EXCLUDED.is_active,
    sku = EXCLUDED.sku,
    updated_at = NOW();

-- Product 2: Women's Formal Shirt (Womens)
INSERT INTO products (id, title, slug, description, price_cents, category_id, subcategory_id, in_stock, is_active, sku) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0002', 'Women''s Formal Shirt - White', 'womens-formal-shirt-white', 'Elegant white formal shirt perfect for office wear. Made from premium cotton blend for comfort and durability. Classic fit with button-down collar.', 149900, '11111111-1111-1111-1111-111111111002', '33333333-3333-3333-3333-333333333001', true, true, 'WM-SH-WHT-001')
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    price_cents = EXCLUDED.price_cents,
    category_id = EXCLUDED.category_id,
    subcategory_id = EXCLUDED.subcategory_id,
    in_stock = EXCLUDED.in_stock,
    is_active = EXCLUDED.is_active,
    sku = EXCLUDED.sku,
    updated_at = NOW();

-- Product 3: Men's Slim Fit Jeans (Mens)
INSERT INTO products (id, title, slug, description, price_cents, category_id, subcategory_id, in_stock, is_active, sku) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0003', 'Men''s Slim Fit Jeans - Blue', 'mens-slim-fit-jeans-blue', 'Stylish slim fit jeans in classic blue denim. Comfortable stretch fabric with modern fit. Perfect for casual everyday wear.', 229900, '11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222004', true, true, 'MN-JN-BLU-001')
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    price_cents = EXCLUDED.price_cents,
    category_id = EXCLUDED.category_id,
    subcategory_id = EXCLUDED.subcategory_id,
    in_stock = EXCLUDED.in_stock,
    is_active = EXCLUDED.is_active,
    sku = EXCLUDED.sku,
    updated_at = NOW();

-- Product 4: Women's Thrifted Denim Jacket (Thrift)
INSERT INTO products (id, title, slug, description, price_cents, category_id, subcategory_id, in_stock, is_active, sku) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0004', 'Women''s Thrifted Denim Jacket - Light Blue', 'womens-thrifted-denim-jacket-light-blue', 'Vintage-inspired denim jacket in light blue wash. Pre-loved quality with unique character. Sustainable fashion choice.', 119900, '11111111-1111-1111-1111-111111111003', '44444444-4444-4444-4444-444444444002', true, true, 'TH-WJ-LBL-001')
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    price_cents = EXCLUDED.price_cents,
    category_id = EXCLUDED.category_id,
    subcategory_id = EXCLUDED.subcategory_id,
    in_stock = EXCLUDED.in_stock,
    is_active = EXCLUDED.is_active,
    sku = EXCLUDED.sku,
    updated_at = NOW();

-- Product 5: Low Top Sneakers (Footwear)
INSERT INTO products (id, title, slug, description, price_cents, category_id, subcategory_id, in_stock, is_active, sku) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0005', 'Low Top Sneakers', 'low-top-sneakers', 'Comfortable low top sneakers perfect for everyday wear. Durable construction with cushioned insole for all-day comfort. Available in multiple sizes.', 249900, '11111111-1111-1111-1111-111111111004', NULL, true, true, 'FW-SNK-LTP-001')
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    price_cents = EXCLUDED.price_cents,
    category_id = EXCLUDED.category_id,
    subcategory_id = EXCLUDED.subcategory_id,
    in_stock = EXCLUDED.in_stock,
    is_active = EXCLUDED.is_active,
    sku = EXCLUDED.sku,
    updated_at = NOW();

-- ============================================
-- 5. INSERT PRODUCT IMAGES (Referencing Product IDs)
-- ============================================

-- Delete existing images for these products first (if any)
DELETE FROM product_images WHERE product_id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0003',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0004',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0005'
);

-- Images for Product 1: Men's Racing Jacket
INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', '/products/racing-jacket-black-1.jpg', 'Men''s Racing Jacket - Black front view', 1, true),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', '/products/racing-jacket-black-2.jpg', 'Men''s Racing Jacket - Black side view', 2, false);

-- Images for Product 2: Women's Formal Shirt
INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0002', '/products/womens-formal-shirt-white-1.jpg', 'Women''s Formal Shirt - White front view', 1, true),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0002', '/products/womens-formal-shirt-white-2.jpg', 'Women''s Formal Shirt - White detail view', 2, false);

-- Images for Product 3: Men's Slim Fit Jeans
INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0003', '/products/mens-jeans-blue-1.jpg', 'Men''s Slim Fit Jeans - Blue front view', 1, true);

-- Images for Product 4: Women's Thrifted Denim Jacket
INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0004', '/products/womens-denim-jacket-1.jpg', 'Women''s Thrifted Denim Jacket - Light Blue front view', 1, true),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0004', '/products/womens-denim-jacket-2.jpg', 'Women''s Thrifted Denim Jacket - Light Blue back view', 2, false);

-- Images for Product 5: Low Top Sneakers
INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0005', '/products/sneakers-low-top-1.jpg', 'Low Top Sneakers front view', 1, true),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0005', '/products/sneakers-low-top-2.jpg', 'Low Top Sneakers side view', 2, false);

-- ============================================
-- 6. INSERT PRODUCT VARIANTS (Colours & Sizes)
-- ============================================
DELETE FROM product_variants WHERE product_id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0002'
);

INSERT INTO product_variants (product_id, color, sizes, image_urls, display_order) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', 'black', ARRAY['S','M','L','XL'], ARRAY['/products/racing-jacket-black-1.jpg','/products/racing-jacket-black-2.jpg'], 1),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', 'white', ARRAY['M','L'], ARRAY['/products/racing-jacket-black-2.jpg'], 2),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0002', 'white', ARRAY['XS','S','M'], ARRAY['/products/womens-formal-shirt-white-1.jpg'], 1);

