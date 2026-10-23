/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: '**.vercel.app' },
    ],
    unoptimized: true,
  },
  typescript: { 
    ignoreBuildErrors: true 
  },
  eslint: { 
    ignoreDuringBuilds: true 
  },
  // On enlève experimental qui te met en rouge
  experimental: {},
}

module.exports = nextConfig
