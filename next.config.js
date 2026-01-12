/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'dnzuvtkbsprzpdfajbxh.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    unoptimized: false,
  },
}

module.exports = nextConfig
