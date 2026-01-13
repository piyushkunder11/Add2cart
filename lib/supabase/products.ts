import { supabase } from './client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Product } from '@/lib/store/catalog'

// Re-export Product type for convenience
export type { Product }

export interface SupabaseProduct {
  id: string
  title: string
  slug: string
  description: string | null
  price_cents: number
  category_id: string
  subcategory_id: string | null
  in_stock: boolean
  is_active: boolean
  tags: string[] | null
  created_at: string
  updated_at: string
  categories: {
    slug: string
  } | null
  subcategories: {
    slug: string
  } | null
  product_images: Array<{
    id: string
    image_url: string
    alt_text: string | null
    is_primary: boolean
    display_order: number
  }>
  product_variants?: Array<{
    id: string
    color: string
    sizes: string[]
    image_urls: string[]
    display_order: number
  }>
}

// Realtime subscription (singleton)
let productsChannel: RealtimeChannel | null = null
const productSubscribers = new Set<() => void>()
let lastRealtimeEvent: { type: string; table: string; timestamp: number } | null = null

function handleRealtimeEvent(eventType: string, table: string) {
  lastRealtimeEvent = { type: eventType, table, timestamp: Date.now() }
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Realtime] ${eventType} on ${table}`, lastRealtimeEvent)
  }
  productSubscribers.forEach((cb) => cb())
}

export function subscribeToProductsRealtime(onChange: () => void): () => void {
  productSubscribers.add(onChange)

  if (!productsChannel) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Realtime] Creating singleton channel for products')
    }
    productsChannel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => handleRealtimeEvent(payload.eventType, 'products')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_images' },
        (payload) => handleRealtimeEvent(payload.eventType, 'product_images')
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_variants' },
        (payload) => handleRealtimeEvent(payload.eventType, 'product_variants')
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[Realtime] Successfully subscribed to products, product_images, product_variants')
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error')
        } else if (status === 'TIMED_OUT') {
          console.error('[Realtime] Subscription timed out')
        } else if (status === 'CLOSED') {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[Realtime] Channel closed')
          }
        }
      })
  } else {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Realtime] Reusing existing channel (subscribers:', productSubscribers.size, ')')
    }
  }

  return () => {
    productSubscribers.delete(onChange)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Realtime] Unsubscribed (remaining:', productSubscribers.size, ')')
    }
    if (productSubscribers.size === 0 && productsChannel) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Realtime] No subscribers left, removing channel')
      }
      supabase.removeChannel(productsChannel)
      productsChannel = null
    }
  }
}

// Export for debug panel
export function getRealtimeStatus() {
  return {
    connected: productsChannel !== null,
    subscribers: productSubscribers.size,
    lastEvent: lastRealtimeEvent,
  }
}

/**
 * Fetch products from Supabase with their images
 */
export async function fetchProductsFromSupabase(
  categorySlug?: string,
  subcategorySlug?: string
): Promise<Product[]> {
  try {
    let categoryId: string | null = null
    let subcategoryId: string | null = null

    // Get category ID by slug if provided
    if (categorySlug) {
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single()
      
      // If category doesn't exist, return empty array
      if (catError || !catData) {
        console.warn(`Category with slug '${categorySlug}' not found`)
        return []
      }
      categoryId = catData.id
    }

    // Get subcategory ID by slug if provided
    if (subcategorySlug) {
      const { data: subcatData } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', subcategorySlug)
        .single()
      subcategoryId = subcatData?.id || null
    }

    let query = supabase
      .from('products')
      .select(`
        id,
        title,
        slug,
        description,
        price_cents,
        category_id,
        subcategory_id,
        in_stock,
        is_active,
        tags,
        created_at,
        updated_at,
        categories!products_category_id_fkey(slug),
        subcategories:categories!products_subcategory_id_fkey(slug),
        product_images(id, image_url, alt_text, is_primary, display_order),
        product_variants(id, color, sizes, image_urls, display_order)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Filter by category_id if we have it
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    // Filter by subcategory_id if we have it
    if (subcategoryId) {
      query = query.eq('subcategory_id', subcategoryId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching products from Supabase:', error)
      return []
    }

    if (!data) {
      return []
    }

    // Transform Supabase data to Product format
    return (data as SupabaseProduct[]).map((product) => {
      // Get primary image or first image
      const primaryImage = product.product_images.find(img => img.is_primary) || product.product_images[0]
      const imageUrl = primaryImage?.image_url || '/products/placeholder.jpg'

      const variants = (product.product_variants || [])
        .sort((a, b) => a.display_order - b.display_order)
        .map((variant) => ({
          id: variant.id,
          color: variant.color,
          sizes: variant.sizes || [],
          images: variant.image_urls || [],
        }))

      return {
        id: product.id,
        title: product.title,
        priceCents: product.price_cents,
        category: product.categories?.slug || '',
        subcategory: product.subcategories?.slug || undefined,
        inStock: product.in_stock,
        image: imageUrl,
        description: product.description || undefined,
        tags: product.tags || undefined,
        variants: variants.length ? variants : undefined,
        createdAt: new Date(product.created_at).getTime(),
        updatedAt: new Date(product.updated_at).getTime(),
      } as Product
    })
  } catch (error) {
    console.error('Error in fetchProductsFromSupabase:', error)
    return []
  }
}

/**
 * Fetch products by category slug pattern (e.g., mens-*, womens-*, thrift-*)
 * This fetches products where subcategory slug starts with the pattern
 */
export async function fetchProductsByCategoryPattern(pattern: string): Promise<Product[]> {
  try {
    // Get main category by slug
    const { data: categoryData } = await supabase
      .from('categories')
      .select('id, slug')
      .eq('slug', pattern)
      .single()

    if (!categoryData) {
      return []
    }

    // Get all subcategories that start with pattern- (e.g., mens-jacket, mens-shirts)
    const { data: subcategories } = await supabase
      .from('categories')
      .select('id, slug')
      .eq('parent_id', categoryData.id)
      .like('slug', `${pattern}-%`)

    const subcategoryIds = subcategories?.map(sub => sub.id) || []

    if (subcategoryIds.length === 0) {
      return []
    }

    // Fetch products with matching subcategory_ids
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        title,
        slug,
        description,
        price_cents,
        category_id,
        subcategory_id,
        in_stock,
        is_active,
        tags,
        created_at,
        updated_at,
        categories!products_category_id_fkey(slug),
        subcategories:categories!products_subcategory_id_fkey(slug),
        product_images(id, image_url, alt_text, is_primary, display_order),
        product_variants(id, color, sizes, image_urls, display_order)
      `)
      .in('subcategory_id', subcategoryIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching products by category pattern:', error)
      return []
    }

    if (!data) {
      return []
    }

    return data.map((product: SupabaseProduct) => {
      const primaryImage = product.product_images.find(img => img.is_primary) || product.product_images[0]
      const imageUrl = primaryImage?.image_url || '/products/placeholder.jpg'

      const variantsList = (product.product_variants || [])
        .sort((a, b) => a.display_order - b.display_order)
        .map((variant) => ({
          id: variant.id,
          color: variant.color,
          sizes: variant.sizes || [],
          images: variant.image_urls || [],
        }))

      return {
        id: product.id,
        title: product.title,
        priceCents: product.price_cents,
        category: product.categories?.slug || '',
        subcategory: product.subcategories?.slug || undefined,
        inStock: product.in_stock,
        image: imageUrl,
        description: product.description || undefined,
        tags: product.tags || undefined,
        variants: variantsList.length ? variantsList : undefined,
        createdAt: new Date(product.created_at).getTime(),
        updatedAt: new Date(product.updated_at).getTime(),
      }
    })
  } catch (error) {
    console.error('Error in fetchProductsByCategoryPattern:', error)
    return []
  }
}

/**
 * Fetch a single product by ID with all images
 * Returns product and separate images array
 */
export async function fetchProductById(id: string): Promise<{ product: Product; images: string[] } | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        title,
        slug,
        description,
        price_cents,
        category_id,
        subcategory_id,
        in_stock,
        is_active,
        tags,
        created_at,
        updated_at,
        categories!products_category_id_fkey(slug),
        subcategories:categories!products_subcategory_id_fkey(slug),
        product_images(id, image_url, alt_text, is_primary, display_order),
        product_variants(id, color, sizes, image_urls, display_order)
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return null
    }

    const product = data as SupabaseProduct
    const primaryImage = product.product_images.find(img => img.is_primary) || product.product_images[0]
    const imageUrl = primaryImage?.image_url || '/products/placeholder.jpg'
    
    // Get all images sorted by display_order
    const allImages = product.product_images
      .sort((a, b) => a.display_order - b.display_order)
      .map(img => img.image_url)

    const variantsList = (product.product_variants || [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((variant) => ({
        id: variant.id,
        color: variant.color,
        sizes: variant.sizes || [],
        images: variant.image_urls || [],
      }))

    return {
      product: {
        id: product.id,
        title: product.title,
        priceCents: product.price_cents,
        category: product.categories?.slug || '',
        subcategory: product.subcategories?.slug || undefined,
        inStock: product.in_stock,
        image: imageUrl,
        description: product.description || undefined,
        tags: product.tags || undefined,
        variants: variantsList.length ? variantsList : undefined,
        createdAt: new Date(product.created_at).getTime(),
        updatedAt: new Date(product.updated_at).getTime(),
      },
      images: allImages.length > 0 ? allImages : [imageUrl],
    }
  } catch (error) {
    console.error('Error fetching product by ID:', error)
    return null
  }
}

