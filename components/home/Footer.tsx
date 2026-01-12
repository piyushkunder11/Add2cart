'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-gray-900 mb-4">Add2Cart</h3>
            <p className="text-gray-600 text-sm">
              Affordable fashion with curated thrifted and new apparel.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#best-seller" className="text-gray-900 hover:text-neutral-700 transition-colors">
                  Best Seller
                </Link>
              </li>
              <li>
                <Link href="#mens" className="text-gray-900 hover:text-neutral-700 transition-colors">
                  Mens
                </Link>
              </li>
              <li>
                <Link href="#womens" className="text-gray-900 hover:text-neutral-700 transition-colors">
                  Womens
                </Link>
              </li>
              <li>
                <Link href="#thrift" className="text-gray-900 hover:text-neutral-700 transition-colors">
                  Thrift
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#about" className="text-gray-900 hover:text-neutral-700 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="#contact" className="text-gray-900 hover:text-neutral-700 transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Newsletter</h4>
            <form className="space-y-3">
              <input
                type="email"
                placeholder="Your email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                type="submit"
                className="w-full px-4 py-2 bg-primary text-white hover:bg-neutral-800 active:bg-neutral-900 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} Add2Cart. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

