/**
 * Get size measurements based on product type and size
 */

export type ProductType = 'upper-wear' | 'bottom-wear'

export interface SizeMeasurement {
  display: string
  full: string
}

const UPPER_WEAR_MEASUREMENTS: Record<string, SizeMeasurement> = {
  S: {
    display: 'Chest 38" | Shoulder 17"',
    full: 'Chest 38" | Shoulder 17"',
  },
  M: {
    display: 'Chest 40" | Shoulder 17.5"',
    full: 'Chest 40" | Shoulder 17.5"',
  },
  L: {
    display: 'Chest 42" | Shoulder 18"',
    full: 'Chest 42" | Shoulder 18"',
  },
  XL: {
    display: 'Chest 44" | Shoulder 18.5"',
    full: 'Chest 44" | Shoulder 18.5"',
  },
  XXL: {
    display: 'Chest 46" | Shoulder 19"',
    full: 'Chest 46" | Shoulder 19"',
  },
}

const BOTTOM_WEAR_MEASUREMENTS: Record<string, SizeMeasurement> = {
  S: {
    display: 'Waist 28-30 (Inch) | 70-75 (CM)',
    full: 'Waist 28-30 (Inch) | 70-75 (CM)',
  },
  M: {
    display: 'Waist 32-34 (Inch) | 80-85 (CM)',
    full: 'Waist 32-34 (Inch) | 80-85 (CM)',
  },
  L: {
    display: 'Waist 36-38 (Inch) | 90-95 (CM)',
    full: 'Waist 36-38 (Inch) | 90-95 (CM)',
  },
  XL: {
    display: 'Waist 40-42 (Inch) | 100-105 (CM)',
    full: 'Waist 40-42 (Inch) | 100-105 (CM)',
  },
  XXL: {
    display: 'Waist 44-46 (Inch) | 110-115 (CM)',
    full: 'Waist 44-46 (Inch) | 110-115 (CM)',
  },
}

/**
 * Get size measurement for a given product type and size
 */
export function getSizeMeasurement(
  productType: ProductType | null | undefined,
  size: string
): SizeMeasurement | null {
  if (!productType || !size) return null

  const measurements =
    productType === 'upper-wear'
      ? UPPER_WEAR_MEASUREMENTS
      : BOTTOM_WEAR_MEASUREMENTS

  return measurements[size.toUpperCase()] || null
}

/**
 * Determine product type from tags
 */
export function getProductTypeFromTags(tags?: string[]): ProductType | null {
  if (!tags || tags.length === 0) return null

  if (tags.includes('Upper Wear')) return 'upper-wear'
  if (tags.includes('Bottom Wear')) return 'bottom-wear'

  return null
}

