import AdminLoginCard from '@/components/admin/AdminLoginCard'

export const metadata = {
  title: 'Admin Login - Add2Cart',
  description: 'Admin access to Add2Cart dashboard',
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-black/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-black/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <AdminLoginCard />
      </div>
    </div>
  )
}

