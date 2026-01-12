import { z } from 'zod'

// Phone normalizer: strips spaces, dashes, and keeps digits with optional + prefix
export function normalizePhone(phone: string): string {
  // Remove all spaces, dashes, parentheses, and dots
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  
  // If it starts with +, keep it, otherwise remove any + signs
  if (cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.slice(1).replace(/\D/g, '')
  } else {
    cleaned = cleaned.replace(/\D/g, '')
  }
  
  return cleaned
}

// Validation schema for admin login
export const adminLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .refine(
      (val) => {
        const normalized = normalizePhone(val)
        // Allow 10-15 digits with optional + prefix
        const digitsOnly = normalized.replace(/\D/g, '')
        return digitsOnly.length >= 10 && digitsOnly.length <= 15
      },
      {
        message: 'Phone number must be 10-15 digits',
      }
    ),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
})

export type AdminLoginFormData = z.infer<typeof adminLoginSchema>

