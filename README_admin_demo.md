# Add2Cart Admin Dashboard - Demo Guide

This is a demo admin dashboard built with Next.js 14, TypeScript, Tailwind CSS, and Framer Motion. It uses IndexedDB (via localForage) for client-side data persistence.

## Demo Credentials

- **Email**: `admin@demo.com`
- **Password**: `Demo@123`

## Features

### Orders Management
- View all orders with filtering and search
- Filter by status (pending, paid, shipped, delivered, cancelled)
- Search by order number, customer name, email, or phone
- View order details with customer information and items
- Update order status with confirmation modals
- Add order notes
- Pagination support

### Products Management
- View all products in a table/grid layout
- Filter by category and stock status
- Search products by title, description, or SKU
- Sort by date, price, or title
- Add new products with:
  - Title, description, price
  - Category and subcategory selection
  - Stock status toggle
  - Multiple image uploads (stored as Data URLs)
  - SKU management
- Edit existing products
- Delete products with confirmation
- Toggle stock status quickly

### Categories & Subcategories
- Hierarchical category system
- Support for parent categories and subcategories
- Categories are automatically created from seed data

### Settings
- Store name and logo
- Support email and phone
- Currency (fixed to INR for now)

### Dashboard
- Overview statistics:
  - Total orders
  - Pending orders
  - Total products
  - Out of stock count
  - Total revenue
  - Today's orders
- Quick action links

## Data Storage

The demo uses **IndexedDB** (via localForage) for data persistence. All data is stored locally in the browser and persists across page refreshes.

### Data Keys
- `products` - Product catalog
- `orders` - Order records
- `categories` - Category hierarchy
- `settings` - Store settings
- `seeded` - Flag indicating if seed data has been loaded

## Resetting Data

To reset all data and reload seed data:

1. Open your browser's Developer Tools (F12)
2. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Navigate to **IndexedDB** → **add2cart_admin**
4. Delete the database or clear all stores
5. Refresh the page - seed data will be reloaded automatically

Alternatively, you can use the browser console:

```javascript
// Clear all data
localforage.createInstance({
  name: 'add2cart_admin',
  storeName: 'admin_data',
}).clear().then(() => {
  console.log('All data cleared. Refresh the page to reload seed data.');
  location.reload();
});
```

## Architecture

### File Structure

```
app/admin/
  layout.tsx              # Admin layout with sidebar and topbar
  page.tsx                # Dashboard overview
  login/page.tsx          # Admin login page
  orders/
    page.tsx              # Orders list
    [id]/page.tsx         # Order detail
  products/
    page.tsx              # Products list
    new/page.tsx          # New product form
    [id]/page.tsx         # Edit product form
  settings/page.tsx       # Settings page

components/admin/
  Sidebar.tsx             # Navigation sidebar
  Topbar.tsx              # Top navigation bar
  ImageUploader.tsx       # Image upload component
  ConfirmModal.tsx        # Confirmation dialog
  VirtualTable.tsx        # Virtualized table (for large datasets)

lib/demo/
  types.ts                # TypeScript types
  validators.ts           # Zod schemas
  db.ts                   # Data layer (IndexedDB operations)
  auth.ts                 # Authentication store

public/
  admin-seed.json         # Seed data for initial setup
```

### Data Layer (`lib/demo/db.ts`)

The data layer provides a clean API for all database operations:

#### Products
- `listProducts(params)` - List products with filtering, sorting, and pagination
- `getProduct(id)` - Get a single product
- `createProduct(input)` - Create a new product
- `updateProduct(id, patch)` - Update a product
- `deleteProduct(id)` - Delete a product
- `toggleStock(id)` - Toggle stock status

#### Orders
- `listOrders(params)` - List orders with filtering and pagination
- `getOrder(id)` - Get a single order
- `createOrder(input)` - Create a new order
- `updateOrderStatus(id, status)` - Update order status
- `updateOrderNotes(id, notes)` - Update order notes

#### Categories
- `listCategories()` - List all categories
- `getCategory(id)` - Get a single category
- `createCategory(input)` - Create a category
- `updateCategory(id, patch)` - Update a category
- `deleteCategory(id)` - Delete a category

#### Settings
- `getSettings()` - Get store settings
- `updateSettings(input)` - Update settings

### Migrating to a Real Backend

To swap the demo data layer with real API calls, you can keep the same function signatures in `lib/demo/db.ts` but replace the IndexedDB operations with API calls:

1. **Create API routes** in `app/api/`:
   - `app/api/products/route.ts`
   - `app/api/products/[id]/route.ts`
   - `app/api/orders/route.ts`
   - `app/api/orders/[id]/route.ts`
   - `app/api/categories/route.ts`
   - `app/api/settings/route.ts`

2. **Update `lib/demo/db.ts`** to make HTTP requests instead of IndexedDB operations:

```typescript
// Example: Replace listProducts
export async function listProducts(params: ListProductsParams) {
  const queryParams = new URLSearchParams()
  if (params.q) queryParams.append('q', params.q)
  if (params.categoryId) queryParams.append('categoryId', params.categoryId)
  // ... etc
  
  const response = await fetch(`/api/products?${queryParams}`)
  return response.json()
}
```

3. **Update authentication** in `lib/demo/auth.ts` to use your auth provider (Supabase, Auth0, etc.)

4. **Remove seed data** - Remove the automatic seeding from `app/admin/layout.tsx`

5. **Update image handling** - Replace Data URL storage with file uploads to your storage service (S3, Cloudinary, etc.)

## Performance Considerations

- **Virtualization**: The `VirtualTable` component uses `@tanstack/react-virtual` for efficient rendering of large lists
- **Debounced Search**: Search inputs are debounced (250ms) to reduce API calls
- **Pagination**: Large datasets are paginated (25 items per page by default)
- **Lazy Loading**: Images use lazy loading with `loading="lazy"`
- **IndexedDB**: Uses IndexedDB for better performance than localStorage for large datasets

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

Note: IndexedDB is required. Older browsers may not be supported.

## Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Navigate to `http://localhost:3000/admin/login`

4. Login with demo credentials:
   - Email: `admin@demo.com`
   - Password: `Demo@123`

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Troubleshooting

### Data not persisting
- Check browser console for IndexedDB errors
- Ensure IndexedDB is enabled in browser settings
- Clear browser cache and reload

### Images not loading
- Check that images are valid Data URLs
- Ensure image size is under 5MB
- Check browser console for errors

### Performance issues
- Reduce the number of products/orders in seed data
- Increase pagination page size
- Use virtualization for large lists

## Future Enhancements

- [ ] Real backend API integration
- [ ] File upload for images (S3, Cloudinary)
- [ ] Bulk operations (delete, update status)
- [ ] Export to CSV
- [ ] Advanced analytics
- [ ] Inventory management
- [ ] Customer management
- [ ] Email notifications
- [ ] Multi-currency support
- [ ] Tax configuration
- [ ] Shipping zones and rates

## License

This is a demo project for Add2Cart admin dashboard.

