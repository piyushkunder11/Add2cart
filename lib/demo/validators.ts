import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  slug: z.string().min(1, 'Slug is required'),
  parentId: z.string().optional(),
})

export const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priceCents: z.number().int().min(0, 'Price must be positive'),
  currency: z.literal('INR'),
  inStock: z.boolean(),
  categoryId: z.string().min(1, 'Category is required'),
  subcategoryId: z.string().optional(),
  images: z.array(z.string().min(1)).min(1, 'At least one image is required'),
  sku: z.string().optional(),
})

export const orderStatusSchema = z.enum([
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
])

export const orderItemSchema = z.object({
  productId: z.string(),
  title: z.string(),
  priceCents: z.number().int().min(0),
  qty: z.number().int().min(1),
})

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(1, 'Phone is required'),
})

export const orderSchema = z.object({
  customer: customerSchema,
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  subtotalCents: z.number().int().min(0),
  shippingCents: z.number().int().min(0),
  totalCents: z.number().int().min(0),
  status: orderStatusSchema,
  paymentMethod: z.enum(['razorpay', 'cod']).optional(),
  notes: z.string().optional(),
})

export const settingsSchema = z.object({
  storeName: z.string().min(1, 'Store name is required'),
  storeLogo: z.string().optional(),
  supportEmail: z.string().email('Invalid email'),
  supportPhone: z.string().min(1, 'Phone is required'),
  currency: z.literal('INR'),
})

export type CategoryInput = z.infer<typeof categorySchema>
export type ProductInput = z.infer<typeof productSchema>
export type OrderInput = z.infer<typeof orderSchema>
export type SettingsInput = z.infer<typeof settingsSchema>

