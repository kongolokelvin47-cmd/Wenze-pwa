/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    unoptimized: true,
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    missingSuspenseWithCSRBailout: false,
    optimizePackageImports: ['lucide-react'],
  },
  // Force Vercel à ignorer les erreurs de pages
  skipTrailingSlashRedirect: true,
}
module.exports = nextConfig
