import { supabase } from './client'

export interface Category {
  id: string
  name: string
  slug: string
  parent_id: string | null
  description: string | null
  image_url: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Fetch all categories from Supabase
 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, parent_id, description, image_url, display_order, is_active, created_at, updated_at')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return []
    }

    return (data as Category[]) || []
  } catch (error) {
    console.error('Error in fetchCategories:', error)
    return []
  }
}

/**
 * Fetch a category by slug
 */
export async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, parent_id, description, image_url, display_order, is_active, created_at, updated_at')
      .eq('slug', slug)
      .single()

    if (error || !data) {
      return null
    }

    return data as Category
  } catch (error) {
    console.error('Error in fetchCategoryBySlug:', error)
    return null
  }
}

/**
 * Fetch subcategories by parent category slug
 */
export async function fetchSubcategoriesByParentSlug(parentSlug: string): Promise<Category[]> {
  try {
    // First get the parent category
    const parent = await fetchCategoryBySlug(parentSlug)
    if (!parent) {
      return []
    }

    // Then get all subcategories (explicit columns so image_url is always returned)
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, parent_id, description, image_url, display_order, is_active, created_at, updated_at')
      .eq('parent_id', parent.id)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching subcategories:', error)
      return []
    }

    return (data as Category[]) || []
  } catch (error) {
    console.error('Error in fetchSubcategoriesByParentSlug:', error)
    return []
  }
}

/**
 * Update category image URL
 */
export async function updateCategoryImage(categoryId: string, imageUrl: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('categories')
      .update({
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', categoryId)

    if (error) {
      throw new Error(`Failed to update category image: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in updateCategoryImage:', error)
    throw error
  }
}
