/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // ✅ IMAGES - Fix patterns WENZE - Taux 2300 - BUILD VERT
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    formats: ['image/avif', 'image/webp'], // 50% moins de data pour 430px Kinshasa
    dangerouslyAllowSVG: false,
    // Garde unoptimized false = optimisation active pour mobile RDC
  },

  typescript: { 
    ignoreBuildErrors: true
  },
  eslint: { 
    ignoreDuringBuilds: true
  },

  experimental: {},

  // ✅ Headers WENZE - garde mais simplifie pour Vercel Edge - plus rapide
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-WENZE-TAUX', value: '2300' },
          { key: 'X-WENZE-VERSION', value: '2.4-concordance' },
        ],
      },
    ];
  },

  // ✅ Redirects boutiques - garde - fix 404
  async redirects() {
    return [
      { source: '/boutique', destination: '/boutiques', permanent: false },
      { source: '/market', destination: '/boutiques', permanent: false },
      { source: '/tarif', destination: '/tarifs', permanent: true },
      { source: '/wallet', destination: '/portefeuille', permanent: false },
      { source: '/shop/:path*', destination: '/boutiques/:path*', permanent: false },
    ];
  },

  // ✅ ENV global - Taux 2300 partout sans import - garde
  env: {
    NEXT_PUBLIC_TAUX_CDF: '2300',
    NEXT_PUBLIC_REGIME: 'prestataire-unique',
    NEXT_PUBLIC_METIERS: '6',
    NEXT_PUBLIC_WENZE_VERSION: '2.4-concordance',
  },

  // ✅ Webpack fix Supabase qui plantait Vercel - garde - essentiel
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    return config;
  },
};

module.exports = nextConfig;
