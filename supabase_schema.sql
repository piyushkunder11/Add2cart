-- Add2Cart E-commerce Database Schema
-- Supabase Postgres SQL Script

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CATEGORIES TABLE (with parent_id for subcategories)
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    description TEXT,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for parent_id lookups
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- ============================================
-- 2. PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    subcategory_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    in_stock BOOLEAN DEFAULT true,
    sku VARCHAR(100) UNIQUE,
    brand VARCHAR(255),
    material TEXT,
    care_instructions TEXT,
    weight_grams INTEGER,
    tags TEXT[], -- Array of tags
    meta_title VARCHAR(255),
    meta_description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products(in_stock);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_price_cents ON products(price_cents);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- ============================================
-- 3. PRODUCT_IMAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for product_images
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON product_images(product_id, display_order);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(product_id, is_primary) WHERE is_primary = true;

-- Ensure only one primary image per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_one_primary 
ON product_images(product_id) 
WHERE is_primary = true;

-- ============================================
-- 3b. PRODUCT_VARIANTS TABLE (colours & sizes)
-- ============================================
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    color VARCHAR(100) NOT NULL,
    sizes TEXT[] NOT NULL,
    image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_color ON product_variants(color);

-- ============================================
-- 4. BANNERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    description TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    link_text VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    position VARCHAR(50) DEFAULT 'homepage', -- homepage, category, product, etc.
    target_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for banners
CREATE INDEX IF NOT EXISTS idx_banners_position ON banners(position);
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_display_order ON banners(position, display_order);
CREATE INDEX IF NOT EXISTS idx_banners_dates ON banners(start_date, end_date);

-- ============================================
-- 5. USER_ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID, -- Reference to your users table (if you have one)
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    
    -- Address stored as JSON
    address_json JSONB NOT NULL,
    /*
    Example address_json structure:
    {
        "fullName": "John Doe",
        "phone": "+1234567890",
        "email": "john@example.com",
        "flat": "Apt 4B",
        "street": "123 Main St",
        "landmark": "Near Park",
        "city": "New York",
        "state": "NY",
        "pincode": "10001",
        "country": "USA"
    }
    */
    
    -- Order items stored as JSON
    items_json JSONB NOT NULL,
    /*
    Example items_json structure:
    [
        {
            "id": "product-uuid",
            "title": "Product Name",
            "price": 1999.00,
            "quantity": 2,
            "image": "https://...",
            "variant": "Size: L, Color: Blue"
        }
    ]
    */
    
    -- Pricing
    subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
    shipping_cents INTEGER DEFAULT 0 CHECK (shipping_cents >= 0),
    tax_cents INTEGER DEFAULT 0 CHECK (tax_cents >= 0),
    discount_cents INTEGER DEFAULT 0 CHECK (discount_cents >= 0),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    
    -- Payment
    payment_method VARCHAR(50), -- razorpay, cod, upi, etc.
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
    payment_id VARCHAR(255),
    payment_date TIMESTAMP WITH TIME ZONE,
    
    -- Order status
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, processing, shipped, delivered, cancelled, returned
    status_history JSONB DEFAULT '[]'::jsonb,
    /*
    Example status_history:
    [
        {"status": "pending", "timestamp": "2024-01-01T10:00:00Z", "note": "Order placed"},
        {"status": "confirmed", "timestamp": "2024-01-01T10:05:00Z", "note": "Payment received"}
    ]
    */
    
    -- Shipping
    tracking_number VARCHAR(255),
    shipping_provider VARCHAR(100),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    customer_notes TEXT,
    admin_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_address_json ON orders USING GIN(address_json);
CREATE INDEX IF NOT EXISTS idx_orders_items_json ON orders USING GIN(items_json);

-- ============================================
-- 7. AUTO-UPDATE TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. CREATE TRIGGERS FOR ALL TABLES
-- ============================================

-- Categories trigger
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Products trigger
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Product images trigger
DROP TRIGGER IF EXISTS update_product_images_updated_at ON product_images;
CREATE TRIGGER update_product_images_updated_at
    BEFORE UPDATE ON product_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Product variants trigger
DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
CREATE TRIGGER update_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Banners trigger
DROP TRIGGER IF EXISTS update_banners_updated_at ON banners;
CREATE TRIGGER update_banners_updated_at
    BEFORE UPDATE ON banners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Orders trigger
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. HELPER FUNCTION: Generate Order Number
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_order_number TEXT;
    order_count INTEGER;
BEGIN
    -- Format: ORD-YYYYMMDD-XXXXX (e.g., ORD-20240101-00001)
    SELECT COUNT(*) + 1 INTO order_count
    FROM orders
    WHERE DATE(created_at) = CURRENT_DATE;
    
    new_order_number := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                       LPAD(order_count::TEXT, 5, '0');
    
    RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert sample categories
INSERT INTO categories (id, name, slug, parent_id, display_order) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Mens', 'mens', NULL, 1),
    ('00000000-0000-0000-0000-000000000002', 'Womens', 'womens', NULL, 2),
    ('00000000-0000-0000-0000-000000000003', 'Best Seller', 'best-seller', NULL, 3),
    ('00000000-0000-0000-0000-000000000004', 'Thrift', 'thrift', NULL, 4),
    ('00000000-0000-0000-0000-000000000005', 'Jackets', 'jackets', '00000000-0000-0000-0000-000000000001', 1),
    ('00000000-0000-0000-0000-000000000006', 'Shirts', 'shirts', '00000000-0000-0000-0000-000000000001', 2),
    ('00000000-0000-0000-0000-000000000007', 'Tops', 'tops', '00000000-0000-0000-0000-000000000002', 1)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 11. COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE categories IS 'Product categories with support for parent-child relationships (subcategories)';
COMMENT ON TABLE products IS 'Product catalog with links to categories and subcategories';
COMMENT ON TABLE product_images IS 'Product images with support for multiple images per product and primary image designation';
COMMENT ON TABLE banners IS 'Marketing banners for homepage, categories, and other sections';
COMMENT ON TABLE user_roles IS 'User roles and permissions linked to Supabase auth.users';
COMMENT ON TABLE orders IS 'Customer orders with JSON storage for addresses and items, includes full order lifecycle tracking';

COMMENT ON COLUMN categories.parent_id IS 'Self-referencing foreign key for subcategories. NULL means top-level category';
COMMENT ON COLUMN products.price_cents IS 'Price stored in cents to avoid floating point precision issues';
COMMENT ON COLUMN user_roles.user_id IS 'References Supabase auth.users(id). One role per user.';
COMMENT ON COLUMN user_roles.role IS 'User role: admin or user. Default is user.';
COMMENT ON COLUMN orders.address_json IS 'Customer shipping address stored as JSONB for flexibility';
COMMENT ON COLUMN orders.items_json IS 'Order items stored as JSONB array for flexibility';
COMMENT ON COLUMN orders.status_history IS 'Array of status changes with timestamps for order tracking';

