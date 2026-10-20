/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wenze: {
          DEFAULT: '#6C3CE0', // VIOLET OFFICIEL UNIQUE - partout pareil
          primary: '#6C3CE0', 
          dark: '#5A2FC0',
          light: '#9F7AEA',
          bg: '#FFFBF0',
          card: '#FFFFFF',
          accent: '#FF6B35', // Orange CTA Acheter
          success: '#00C950', // Vert validation paiement
          cdf: '#0F172A', // Couleur prix CDF
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        'wenze': '12px',
        'wenze-lg': '16px',
      },
      boxShadow: {
        'wenze': '0 4px 12px rgba(108, 60, 224, 0.15)',
        'wenze-hover': '0 8px 24px rgba(108, 60, 224, 0.25)',
      },
      animation: {
        'wenze-pulse': 'wenze-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        'wenze-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.7' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
