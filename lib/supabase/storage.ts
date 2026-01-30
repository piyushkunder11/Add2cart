import { supabase } from './client'

const BUCKET_NAME = 'product-images'

/**
 * Upload an image file to Supabase Storage
 * @param file - The image file to upload
 * @param productId - The product ID to use in the file path
 * @param fileName - Optional custom file name (defaults to timestamp)
 * @returns The public URL of the uploaded image
 */
export async function uploadProductImage(
  file: File,
  productId: string,
  fileName?: string
): Promise<string> {
  try {
    // Generate unique file name if not provided
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 9)
    const finalFileName = fileName || `${productId}-${timestamp}-${randomStr}.${fileExt}`

    // Upload to storage: product-images/{productId}/{fileName}
    const filePath = `${productId}/${finalFileName}`

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Error uploading image:', error)
      throw new Error(`Failed to upload image: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded image')
    }

    return urlData.publicUrl
  } catch (error) {
    console.error('Error in uploadProductImage:', error)
    throw error
  }
}

/**
 * Delete an image from Supabase Storage
 * @param imageUrl - The public URL of the image to delete
 */
export async function deleteProductImage(imageUrl: string): Promise<void> {
  try {
    // Extract file path from URL
    // URL format: https://{project}.supabase.co/storage/v1/object/public/product-images/{path}
    const urlParts = imageUrl.split('/product-images/')
    if (urlParts.length !== 2) {
      throw new Error('Invalid image URL format')
    }

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) {
      console.error('Error deleting image:', error)
      throw new Error(`Failed to delete image: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in deleteProductImage:', error)
    throw error
  }
}
