import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const BUCKET_NAME = 'product-images'

/**
 * POST /api/categories/upload-image
 * Uploads a category image and updates the category record.
 * Uses service role key so the update persists (RLS would block anon updates).
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const categoryId = formData.get('categoryId') as string

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: 'No category ID provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Use service role so category update persists (anon key is blocked by RLS on categories UPDATE)
    const supabaseServer = createServiceRoleClient()
    if (!supabaseServer) {
      return NextResponse.json(
        {
          error: 'Category image updates require SUPABASE_SERVICE_ROLE_KEY to persist. Add it in .env.local (Supabase Dashboard → Settings → API → service_role).',
        },
        { status: 503 }
      )
    }

    // Generate unique file name
    const fileExt = imageFile.name.split('.').pop()
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 9)
    const fileName = `category-${categoryId}-${timestamp}-${randomStr}.${fileExt}`
    const filePath = `categories/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from(BUCKET_NAME)
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('[Category Upload] Storage error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload image: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabaseServer.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: 'Failed to get public URL for uploaded image' },
        { status: 500 }
      )
    }

    // Get old image URL before updating
    const { data: categoryData } = await supabaseServer
      .from('categories')
      .select('image_url')
      .eq('id', categoryId)
      .single()

    // Delete old image if it exists and is in our storage
    const typedCategoryData = categoryData as { image_url: string | null } | null
    if (typedCategoryData?.image_url) {
      const oldUrl = typedCategoryData.image_url
      if (oldUrl.includes('/product-images/categories/')) {
        try {
          const urlParts = oldUrl.split('/product-images/')
          if (urlParts.length === 2) {
            const oldFilePath = urlParts[1]
            await supabaseServer.storage
              .from(BUCKET_NAME)
              .remove([oldFilePath])
          }
        } catch (deleteError) {
          // Log but don't fail if old image deletion fails
          console.warn('[Category Upload] Failed to delete old image:', deleteError)
        }
      }
    }

    // Update category with new image URL
    const updateQuery = supabaseServer.from('categories') as any
    const { error: updateError } = await updateQuery
      .update({
        image_url: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', categoryId)

    if (updateError) {
      console.error('[Category Upload] Update error:', updateError)
      await supabaseServer.storage.from(BUCKET_NAME).remove([filePath])
      return NextResponse.json(
        { error: `Failed to update category: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Verify the update persisted (so it survives refresh)
    const { data: verify } = await supabaseServer
      .from('categories')
      .select('image_url')
      .eq('id', categoryId)
      .single()

    const typedVerify = verify as { image_url: string | null } | null
    if (!typedVerify?.image_url) {
      console.error('[Category Upload] Update reported success but image_url not set on row')
      return NextResponse.json(
        { error: 'Image was uploaded but the category record did not update. Ensure SUPABASE_SERVICE_ROLE_KEY is set.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      imageUrl: urlData.publicUrl,
    })
  } catch (error: any) {
    console.error('[Category Upload] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
