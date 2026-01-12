import localforage from 'localforage'
import type {
  Category,
  Product,
  Order,
  Settings,
  ListProductsParams,
  ListOrdersParams,
  PaginatedResponse,
} from './types'
import type { ProductInput, CategoryInput, OrderInput, SettingsInput } from './validators'

// Configure localforage
const db = localforage.createInstance({
  name: 'add2cart_admin',
  storeName: 'admin_data',
  description: 'Add2Cart Admin Dashboard Data',
})

// Keys
const KEYS = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  CATEGORIES: 'categories',
  SETTINGS: 'settings',
  SEEDED: 'seeded',
}

// Helper: Get all items from a collection
async function getAll<T>(key: string): Promise<T[]> {
  const data = await db.getItem<T[]>(key)
  return data || []
}

// Helper: Save all items to a collection
async function saveAll<T>(key: string, items: T[]): Promise<void> {
  await db.setItem(key, items)
}

// Helper: Generate ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Helper: Generate slug
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ===== CATEGORIES =====

export async function listCategories(): Promise<Category[]> {
  return getAll<Category>(KEYS.CATEGORIES)
}

export async function getCategory(id: string): Promise<Category | null> {
  const categories = await getAll<Category>(KEYS.CATEGORIES)
  return categories.find((c) => c.id === id) || null
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const categories = await getAll<Category>(KEYS.CATEGORIES)
  const now = new Date().toISOString()
  const category: Category = {
    id: generateId(),
    name: input.name,
    slug: input.slug || generateSlug(input.name),
    parentId: input.parentId,
    createdAt: now,
    updatedAt: now,
  }
  categories.push(category)
  await saveAll(KEYS.CATEGORIES, categories)
  return category
}

export async function updateCategory(
  id: string,
  patch: Partial<CategoryInput>
): Promise<Category | null> {
  const categories = await getAll<Category>(KEYS.CATEGORIES)
  const index = categories.findIndex((c) => c.id === id)
  if (index === -1) return null
  categories[index] = {
    ...categories[index],
    ...patch,
    slug: patch.slug || categories[index].slug,
    updatedAt: new Date().toISOString(),
  }
  await saveAll(KEYS.CATEGORIES, categories)
  return categories[index]
}

export async function deleteCategory(id: string): Promise<boolean> {
  const categories = await getAll<Category>(KEYS.CATEGORIES)
  const filtered = categories.filter((c) => c.id !== id && c.parentId !== id)
  await saveAll(KEYS.CATEGORIES, filtered)
  return filtered.length < categories.length
}

// ===== PRODUCTS =====

export async function listProducts(
  params: ListProductsParams = {}
): Promise<PaginatedResponse<Product>> {
  let products = await getAll<Product>(KEYS.PRODUCTS)
  const {
    q,
    categoryId,
    subcategoryId,
    inStock,
    sort = 'date',
    page = 1,
    pageSize = 25,
  } = params

  // Filter
  if (q) {
    const query = q.toLowerCase()
    products = products.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
    )
  }
  if (categoryId) {
    products = products.filter((p) => p.categoryId === categoryId)
  }
  if (subcategoryId) {
    products = products.filter((p) => p.subcategoryId === subcategoryId)
  }
  if (inStock !== undefined) {
    products = products.filter((p) => p.inStock === inStock)
  }

  // Sort
  if (sort === 'date') {
    products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } else if (sort === 'price') {
    products.sort((a, b) => a.priceCents - b.priceCents)
  } else if (sort === 'title') {
    products.sort((a, b) => a.title.localeCompare(b.title))
  }

  // Paginate
  const total = products.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const items = products.slice(start, end)

  return { items, total, page, pageSize, totalPages }
}

export async function getProduct(id: string): Promise<Product | null> {
  const products = await getAll<Product>(KEYS.PRODUCTS)
  return products.find((p) => p.id === id) || null
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const products = await getAll<Product>(KEYS.PRODUCTS)
  const now = new Date().toISOString()
  const product: Product = {
    id: generateId(),
    title: input.title,
    slug: generateSlug(input.title),
    description: input.description,
    priceCents: input.priceCents,
    currency: input.currency,
    inStock: input.inStock,
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId,
    images: input.images,
    sku: input.sku || `SKU-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  }
  products.push(product)
  await saveAll(KEYS.PRODUCTS, products)
  return product
}

export async function updateProduct(
  id: string,
  patch: Partial<ProductInput>
): Promise<Product | null> {
  const products = await getAll<Product>(KEYS.PRODUCTS)
  const index = products.findIndex((p) => p.id === id)
  if (index === -1) return null
  const updated: Product = {
    ...products[index],
    ...patch,
    slug: patch.title ? generateSlug(patch.title) : products[index].slug,
    updatedAt: new Date().toISOString(),
  }
  products[index] = updated
  await saveAll(KEYS.PRODUCTS, products)
  return updated
}

export async function deleteProduct(id: string): Promise<boolean> {
  const products = await getAll<Product>(KEYS.PRODUCTS)
  const filtered = products.filter((p) => p.id !== id)
  await saveAll(KEYS.PRODUCTS, filtered)
  return filtered.length < products.length
}

export async function toggleStock(id: string): Promise<Product | null> {
  const product = await getProduct(id)
  if (!product) return null
  return updateProduct(id, { inStock: !product.inStock })
}

// ===== ORDERS =====

export async function listOrders(
  params: ListOrdersParams = {}
): Promise<PaginatedResponse<Order>> {
  let orders = await getAll<Order>(KEYS.ORDERS)
  const {
    q,
    status,
    dateFrom,
    dateTo,
    sort = 'date',
    page = 1,
    pageSize = 25,
  } = params

  // Filter
  if (q) {
    const query = q.toLowerCase()
    orders = orders.filter(
      (o) =>
        o.number.toLowerCase().includes(query) ||
        o.customer.name.toLowerCase().includes(query) ||
        o.customer.email.toLowerCase().includes(query) ||
        o.customer.phone.includes(query)
    )
  }
  if (status) {
    orders = orders.filter((o) => o.status === status)
  }
  if (dateFrom) {
    orders = orders.filter((o) => o.createdAt >= dateFrom)
  }
  if (dateTo) {
    orders = orders.filter((o) => o.createdAt <= dateTo)
  }

  // Sort
  if (sort === 'date') {
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } else if (sort === 'total') {
    orders.sort((a, b) => b.totalCents - a.totalCents)
  }

  // Paginate
  const total = orders.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const items = orders.slice(start, end)

  return { items, total, page, pageSize, totalPages }
}

export async function getOrder(id: string): Promise<Order | null> {
  const orders = await getAll<Order>(KEYS.ORDERS)
  return orders.find((o) => o.id === id) || null
}

export async function createOrder(input: OrderInput): Promise<Order> {
  const orders = await getAll<Order>(KEYS.ORDERS)
  const now = new Date().toISOString()
  const order: Order = {
    id: generateId(),
    number: `ORD-${Date.now()}`,
    createdAt: now,
    customer: input.customer,
    items: input.items,
    subtotalCents: input.subtotalCents,
    shippingCents: input.shippingCents,
    totalCents: input.totalCents,
    status: input.status,
    paymentMethod: input.paymentMethod,
    notes: input.notes,
    updatedAt: now,
  }
  orders.push(order)
  await saveAll(KEYS.ORDERS, orders)
  return order
}

export async function updateOrderStatus(
  id: string,
  status: Order['status']
): Promise<Order | null> {
  const orders = await getAll<Order>(KEYS.ORDERS)
  const index = orders.findIndex((o) => o.id === id)
  if (index === -1) return null
  orders[index] = {
    ...orders[index],
    status,
    updatedAt: new Date().toISOString(),
  }
  await saveAll(KEYS.ORDERS, orders)
  return orders[index]
}

export async function updateOrderNotes(id: string, notes: string): Promise<Order | null> {
  const orders = await getAll<Order>(KEYS.ORDERS)
  const index = orders.findIndex((o) => o.id === id)
  if (index === -1) return null
  orders[index] = {
    ...orders[index],
    notes,
    updatedAt: new Date().toISOString(),
  }
  await saveAll(KEYS.ORDERS, orders)
  return orders[index]
}

// ===== SETTINGS =====

export async function getSettings(): Promise<Settings | null> {
  const settings = await db.getItem<Settings>(KEYS.SETTINGS)
  return settings || null
}

export async function updateSettings(input: SettingsInput): Promise<Settings> {
  const existing = await getSettings()
  const settings: Settings = {
    storeName: input.storeName,
    storeLogo: input.storeLogo,
    supportEmail: input.supportEmail,
    supportPhone: input.supportPhone,
    currency: input.currency,
    updatedAt: new Date().toISOString(),
  }
  await db.setItem(KEYS.SETTINGS, settings)
  return settings
}

// ===== SEEDING =====

export async function isSeeded(): Promise<boolean> {
  const seeded = await db.getItem<boolean>(KEYS.SEEDED)
  return seeded === true
}

export async function markSeeded(): Promise<void> {
  await db.setItem(KEYS.SEEDED, true)
}

export async function seedData(data: {
  products: Product[]
  orders: Order[]
  categories: Category[]
  settings: Settings
}): Promise<void> {
  await saveAll(KEYS.PRODUCTS, data.products)
  await saveAll(KEYS.ORDERS, data.orders)
  await saveAll(KEYS.CATEGORIES, data.categories)
  await db.setItem(KEYS.SETTINGS, data.settings)
  await markSeeded()
}

// Helper: Clear all data (for testing)
export async function clearAllData(): Promise<void> {
  await db.removeItem(KEYS.PRODUCTS)
  await db.removeItem(KEYS.ORDERS)
  await db.removeItem(KEYS.CATEGORIES)
  await db.removeItem(KEYS.SETTINGS)
  await db.removeItem(KEYS.SEEDED)
}

