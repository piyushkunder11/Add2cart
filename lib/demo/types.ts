export interface Category {
  id: string
  name: string
  slug: string
  parentId?: string
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  title: string
  slug: string
  description: string
  priceCents: number
  currency: 'INR'
  inStock: boolean
  categoryId: string
  subcategoryId?: string
  images: string[] // Data URLs for demo
  sku?: string
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  productId: string
  title: string
  priceCents: number
  qty: number
}

export interface Customer {
  name: string
  email: string
  phone: string
}

export interface Order {
  id: string
  number: string
  createdAt: string
  customer: Customer
  items: OrderItem[]
  subtotalCents: number
  shippingCents: number
  totalCents: number
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  paymentMethod?: 'razorpay' | 'cod'
  notes?: string
  updatedAt: string
}

export interface Settings {
  storeName: string
  storeLogo?: string // Data URL
  supportEmail: string
  supportPhone: string
  currency: 'INR'
  updatedAt: string
}

export interface ListProductsParams {
  q?: string
  categoryId?: string
  subcategoryId?: string
  inStock?: boolean
  sort?: 'date' | 'price' | 'title'
  page?: number
  pageSize?: number
}

export interface ListOrdersParams {
  q?: string
  status?: Order['status']
  dateFrom?: string
  dateTo?: string
  sort?: 'date' | 'total'
  page?: number
  pageSize?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

