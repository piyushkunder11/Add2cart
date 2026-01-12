import { supabase } from './client'
import { uploadProductImage } from './storage'

export interface CreateProductInput {
  title: string
  slug: string
  description?: string
  price_cents: number
  category_id: string
  subcategory_id?: string
  in_stock: boolean
  sku?: string
  tags?: string[]
  images: File[] // Image files to upload
  variants?: VariantInput[]
}

export interface UpdateProductInput {
  title?: string
  slug?: string
  description?: string
  price_cents?: number
  category_id?: string
  subcategory_id?: string
  in_stock?: boolean
  sku?: string
}

export interface VariantInput {
  color: string
  sizes: string[]
  images: File[]
}

export interface AddImagesResult {
  imageUrls: string[]
}

/**
 * Create a new product with images in Supabase
 */
export async function createProduct(input: CreateProductInput): Promise<string> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[createProduct] start', { title: input.title, category_id: input.category_id, subcategory_id: input.subcategory_id })
    }

    // Validate category_id exists (defensive check - FK will also enforce this)
    const { data: categoryCheck } = await supabase
      .from('categories')
      .select('id')
      .eq('id', input.category_id)
      .single()

    if (!categoryCheck) {
      throw new Error(`Invalid category_id: ${input.category_id}`)
    }

    // Validate subcategory_id if provided
    if (input.subcategory_id) {
      const { data: subcategoryCheck } = await supabase
        .from('categories')
        .select('id, parent_id')
        .eq('id', input.subcategory_id)
        .single()

      if (!subcategoryCheck) {
        throw new Error(`Invalid subcategory_id: ${input.subcategory_id}`)
      }

      // Verify subcategory is actually a child of the category
      if (subcategoryCheck.parent_id !== input.category_id) {
        throw new Error(`Subcategory ${input.subcategory_id} is not a child of category ${input.category_id}`)
      }
    }

    // Ensure unique slug to avoid conflicts
    const uniqueSlug = await ensureUniqueProductSlug(input.slug)

    // First, create the product
    if (process.env.NODE_ENV !== 'production') {
      console.log('[createProduct] inserting product with slug', uniqueSlug)
    }
    const { data: productData, error: productError } = await supabase
      .from('products')
      .insert({
        title: input.title,
        slug: uniqueSlug,
        description: input.description || null,
        price_cents: input.price_cents,
        category_id: input.category_id,
        subcategory_id: input.subcategory_id || null,
        in_stock: input.in_stock,
        sku: input.sku || null,
        tags: input.tags || null,
        is_active: true,
      })
      .select('id, slug')
      .single()

    if (productError || !productData) {
      throw new Error(`Failed to create product: ${productError?.message || 'Unknown error'}`)
    }

    const productId = productData.id
    if (process.env.NODE_ENV !== 'production') {
      console.log('[createProduct] product insert success', productData)
    }

    // Upload images and create product_images records atomically
    let displayOrder = 0
    let hasPrimaryImage = false

    const uploadAndInsertImage = async (
      file: File,
      altText: string,
      forcePrimary = false
    ): Promise<string> => {
      let imageUrl: string | null = null
      try {
        imageUrl = await uploadProductImage(file, productId)
      } catch (uploadErr) {
        console.error('[createProduct] image upload failed, rolling back product', uploadErr)
        await supabase.from('products').delete().eq('id', productId)
        throw uploadErr
      }

      const isPrimary = forcePrimary || !hasPrimaryImage
      const { error: imageError } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          image_url: imageUrl,
          alt_text: altText,
          display_order: displayOrder,
          is_primary: isPrimary,
        })

      if (imageError) {
        console.error(`[createProduct] failed to insert product_images row ${displayOrder + 1}, rolling back product`, imageError)
        await supabase.from('products').delete().eq('id', productId)
        throw new Error(`Failed to save product image: ${imageError.message}`)
      }

      displayOrder += 1
      hasPrimaryImage = hasPrimaryImage || isPrimary
      return imageUrl
    }

    // General/main images (first one becomes primary)
    for (let index = 0; index < input.images.length; index++) {
      await uploadAndInsertImage(input.images[index], `${input.title} - Image ${index + 1}`)
    }

    // Variant-specific images + variant rows
    if (input.variants?.length) {
      for (let variantIndex = 0; variantIndex < input.variants.length; variantIndex++) {
        const variant = input.variants[variantIndex]
        const variantImageUrls: string[] = []

        if (variant.images.length) {
          for (let imageIndex = 0; imageIndex < variant.images.length; imageIndex++) {
            const imageUrl = await uploadAndInsertImage(
              variant.images[imageIndex],
              `${input.title} - ${variant.color} ${imageIndex + 1}`,
              !hasPrimaryImage && variantIndex === 0 && imageIndex === 0
            )
            variantImageUrls.push(imageUrl)
          }
        }

        const { error: variantError } = await supabase
          .from('product_variants')
          .insert({
            product_id: productId,
            color: variant.color,
            sizes: variant.sizes,
            image_urls: variantImageUrls,
            display_order: variantIndex,
          })

        if (variantError) {
          console.error('[createProduct] failed to insert product_variant, rolling back product', variantError)
          await supabase.from('products').delete().eq('id', productId)
          throw new Error(`Failed to save product variant: ${variantError.message}`)
        }
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[createProduct] completed for product', productId)
    }
    return productId
  } catch (error) {
    console.error('Error in createProduct:', error)
    throw error
  }
}

/**
 * Add product-level images (appends after existing display_order)
 */
export async function addProductImages(
  productId: string,
  title: string,
  files: File[]
): Promise<AddImagesResult> {
  if (!files.length) return { imageUrls: [] }

  // Determine starting display_order
  const { data: existing } = await supabase
    .from('product_images')
    .select('display_order')
    .eq('product_id', productId)
    .order('display_order', { ascending: false })
    .limit(1)

  let displayOrder = existing?.[0]?.display_order ?? 0
  const imageUrls: string[] = []

  for (let index = 0; index < files.length; index++) {
    const file = files[index]
    let imageUrl: string | null = null
    try {
      imageUrl = await uploadProductImage(file, productId)
    } catch (uploadErr) {
      console.error('[addProductImages] image upload failed', uploadErr)
      throw uploadErr
    }

    const { error: imageError } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        image_url: imageUrl,
        alt_text: `${title} - Image ${displayOrder + 1}`,
        display_order: displayOrder,
        is_primary: false,
      })

    if (imageError) {
      console.error('[addProductImages] failed to insert product_images row', imageError)
      throw new Error(`Failed to save product image: ${imageError.message}`)
    }

    imageUrls.push(imageUrl)
    displayOrder += 1
  }

  return { imageUrls }
}

/**
 * Delete a product image by URL (removes row and storage object)
 */
export async function deleteProductImageByUrl(productId: string, imageUrl: string): Promise<void> {
  try {
    await supabase
      .from('product_images')
      .delete()
      .eq('product_id', productId)
      .eq('image_url', imageUrl)

    const { deleteProductImage } = await import('./storage')
    await deleteProductImage(imageUrl)
  } catch (error) {
    console.error('Error in deleteProductImageByUrl:', error)
    throw error
  }
}

/**
 * Remove a variant image (updates variant list, removes gallery + storage)
 */
export async function removeVariantImage(
  productId: string,
  variantId: string,
  imageUrl: string
): Promise<void> {
  // Update variant image_urls
  const { data: variantData, error: fetchError } = await supabase
    .from('product_variants')
    .select('image_urls')
    .eq('id', variantId)
    .single()

  if (fetchError || !variantData) {
    throw new Error(`Failed to fetch variant: ${fetchError?.message}`)
  }

  const updated = (variantData.image_urls || []).filter((url: string) => url !== imageUrl)

  const { error: updateError } = await supabase
    .from('product_variants')
    .update({ image_urls: updated })
    .eq('id', variantId)

  if (updateError) {
    throw new Error(`Failed to update variant images: ${updateError.message}`)
  }

  // Remove from gallery + storage
  await deleteProductImageByUrl(productId, imageUrl)
}

/**
 * Delete a variant and its images (also removes images from gallery/storage)
 */
export async function deleteProductVariant(
  productId: string,
  variantId: string
): Promise<void> {
  // Fetch variant data including color
  const { data: variantData, error: fetchError } = await supabase
    .from('product_variants')
    .select('image_urls, color')
    .eq('id', variantId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch variant: ${fetchError.message}`)
  }

  const imageUrls: string[] = variantData?.image_urls || []
  const variantColor = variantData?.color

  // Delete all images associated with this variant BEFORE deleting the variant row
  // This ensures we have the variant data to match images
  const allImageUrlsToDelete = new Set<string>(imageUrls)

  // Get all product_images for this product to find variant-related images
  const { data: productImages } = await supabase
    .from('product_images')
    .select('id, image_url, alt_text')
    .eq('product_id', productId)

  if (productImages) {
    // Find images that match variant color in alt_text or are in variant's image_urls
    productImages.forEach((img) => {
      const altText = img.alt_text?.toLowerCase() || ''
      const colorLower = variantColor?.toLowerCase() || ''
      
      // Add to deletion set if:
      // 1. Image URL is in variant's image_urls array, OR
      // 2. Alt text contains the variant color
      if (imageUrls.includes(img.image_url) || (colorLower && altText.includes(colorLower))) {
        allImageUrlsToDelete.add(img.image_url)
      }
    })
  }

  // Delete all identified images from storage and product_images table
  for (const url of allImageUrlsToDelete) {
    try {
      await deleteProductImageByUrl(productId, url)
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Failed to delete image ${url}:`, err)
      }
      // Continue with other images even if one fails
    }
  }

  // Finally, delete the variant row itself
  const { error: deleteVariantError } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', variantId)

  if (deleteVariantError) {
    throw new Error(`Failed to delete variant: ${deleteVariantError.message}`)
  }
}

/**
 * Create a variant with optional images
 */
export async function createProductVariant(
  productId: string,
  variant: VariantInput,
  title: string
): Promise<string> {
  try {
    const variantImageUrls: string[] = []
    for (let i = 0; i < variant.images.length; i++) {
      const url = await uploadProductImage(variant.images[i], productId)
      variantImageUrls.push(url)
    }

    const { data, error } = await supabase
      .from('product_variants')
      .insert({
        product_id: productId,
        color: variant.color,
        sizes: variant.sizes,
        image_urls: variantImageUrls,
        display_order: 0,
      })
      .select('id')
      .single()

    if (error || !data) {
      throw new Error(`Failed to create variant: ${error?.message}`)
    }

    // Also append these images to product_images for gallery visibility
    if (variantImageUrls.length) {
      await addProductImages(
        productId,
        `${title} - ${variant.color}`,
        variant.images
      )
    }

    return data.id
  } catch (error) {
    console.error('Error in createProductVariant:', error)
    throw error
  }
}

/**
 * Append images to an existing variant (and gallery)
 */
export async function appendVariantImages(
  productId: string,
  variantId: string,
  title: string,
  files: File[]
): Promise<string[]> {
  if (!files.length) return []

  const uploadedUrls: string[] = []
  for (let i = 0; i < files.length; i++) {
    const url = await uploadProductImage(files[i], productId)
    uploadedUrls.push(url)
  }

  // Update variant image_urls array
  const { data: variantData, error: fetchError } = await supabase
    .from('product_variants')
    .select('image_urls')
    .eq('id', variantId)
    .single()

  if (fetchError || !variantData) {
    throw new Error(`Failed to fetch variant: ${fetchError?.message}`)
  }

  const updatedImages = [...(variantData.image_urls || []), ...uploadedUrls]

  const { error: updateError } = await supabase
    .from('product_variants')
    .update({ image_urls: updatedImages })
    .eq('id', variantId)

  if (updateError) {
    throw new Error(`Failed to update variant images: ${updateError.message}`)
  }

  // Also add to product gallery
  await addProductImages(productId, title, files)

  return uploadedUrls
}

/**
 * Update variant sizes
 */
export async function updateVariantSizes(
  variantId: string,
  sizes: string[]
): Promise<void> {
  try {
    const { error } = await supabase
      .from('product_variants')
      .update({ sizes })
      .eq('id', variantId)

    if (error) {
      throw new Error(`Failed to update variant sizes: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in updateVariantSizes:', error)
    throw error
  }
}

/**
 * Update product description
 */
export async function updateProductDescription(productId: string, description: string): Promise<void> {
  await updateProduct(productId, { description })
}

/**
 * Update stock status
 */
export async function updateProductStock(productId: string, inStock: boolean): Promise<void> {
  await updateProduct(productId, { in_stock: inStock })
}

/**
 * Update a product in Supabase
 */
export async function updateProduct(
  productId: string,
  input: UpdateProductInput
): Promise<void> {
  try {
    const updateData: Record<string, any> = {}
    
    if (input.title !== undefined) updateData.title = input.title
    if (input.slug !== undefined) updateData.slug = input.slug
    if (input.description !== undefined) updateData.description = input.description || null
    if (input.price_cents !== undefined) updateData.price_cents = input.price_cents
    if (input.category_id !== undefined) updateData.category_id = input.category_id
    if (input.subcategory_id !== undefined) updateData.subcategory_id = input.subcategory_id || null
    if (input.in_stock !== undefined) updateData.in_stock = input.in_stock
    if (input.sku !== undefined) updateData.sku = input.sku || null

    const { error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)

    if (error) {
      throw new Error(`Failed to update product: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in updateProduct:', error)
    throw error
  }
}

/**
 * Delete a product from Supabase (cascades to product_images and product_variants via FK)
 */
export async function deleteProduct(productId: string): Promise<void> {
  try {
    // Get all image URLs from product_images and product_variants before deletion
    const [imagesResult, variantsResult] = await Promise.all([
      supabase
        .from('product_images')
        .select('image_url')
        .eq('product_id', productId),
      supabase
        .from('product_variants')
        .select('image_urls')
        .eq('product_id', productId),
    ])

    const allImageUrls = new Set<string>()
    
    // Collect all image URLs
    if (imagesResult.data) {
      imagesResult.data.forEach((img) => allImageUrls.add(img.image_url))
    }
    
    if (variantsResult.data) {
      variantsResult.data.forEach((variant) => {
        if (variant.image_urls) {
          variant.image_urls.forEach((url) => allImageUrls.add(url))
        }
      })
    }

    // Delete product (cascades to product_images and product_variants via FK)
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)

    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`)
    }

    // Delete images from storage (in background, don't fail if this fails)
    // Do this after DB deletion to avoid orphaned references
    if (allImageUrls.size > 0) {
      const { deleteProductImage } = await import('./storage')
      allImageUrls.forEach((url) => {
        deleteProductImage(url).catch((err) => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[deleteProduct] Failed to delete image from storage:', url, err)
          }
        })
      })
    }
  } catch (error) {
    console.error('[deleteProduct] Error:', error)
    throw error
  }
}

/**
 * Get category ID by slug
 */
export async function getCategoryIdBySlug(slug: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .single()

    if (error || !data) {
      return null
    }

    return data.id
  } catch (error) {
    console.error('Error in getCategoryIdBySlug:', error)
    return null
  }
}

/**
 * Get subcategory ID by slug
 */
export async function getSubcategoryIdBySlug(slug: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .single()

    if (error || !data) {
      return null
    }

    return data.id
  } catch (error) {
    console.error('Error in getSubcategoryIdBySlug:', error)
    return null
  }
}

/**
 * Find a subcategory by slug or create it under a parent category.
 * Returns the subcategory id (never null if created/found).
 */
export async function getOrCreateSubcategoryId(slug: string, parentCategoryId: string): Promise<string | null> {
  try {
    // Try existing first
    const existingId = await getSubcategoryIdBySlug(slug)
    if (existingId) return existingId

    // Create new subcategory under parent
    const { data, error } = await supabase
      .from('categories')
      .insert({
        slug,
        parent_id: parentCategoryId,
        name: slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      })
      .select('id')
      .single()

    if (error || !data) {
      console.error('Error creating subcategory:', error)
      return null
    }

    return data.id
  } catch (err) {
    console.error('Error in getOrCreateSubcategoryId:', err)
    return null
  }
}

/**
 * Ensure a unique product slug by appending an incrementing suffix if needed.
 */
export async function ensureUniqueProductSlug(baseSlug: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('slug')
      .ilike('slug', `${baseSlug}%`)

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('ensureUniqueProductSlug lookup failed, fallback to timestamp', error)
      }
      return `${baseSlug}-${Date.now()}`
    }

    const existing = new Set((data || []).map((row) => row.slug))
    if (!existing.has(baseSlug)) return baseSlug

    let counter = 1
    let candidate = `${baseSlug}-${counter}`
    while (existing.has(candidate)) {
      counter += 1
      candidate = `${baseSlug}-${counter}`
    }
    return candidate
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('ensureUniqueProductSlug error', err)
    }
    return `${baseSlug}-${Date.now()}`
  }
}

