/**
 * Generate a URL-friendly slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Generate a unique slug by appending a timestamp
 */
export function generateUniqueSlug(text: string): string {
  const baseSlug = generateSlug(text)
  const timestamp = Date.now()
  return `${baseSlug}-${timestamp}`
}

