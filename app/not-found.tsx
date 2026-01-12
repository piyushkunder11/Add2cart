import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700">Page Not Found</h2>
        <p className="text-gray-600">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-neutral-800 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/best-seller"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  )
}

