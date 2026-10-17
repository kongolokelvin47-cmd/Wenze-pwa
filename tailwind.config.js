/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wenze: {
          primary: '#6B46C1', // Violet principal WENZE
          dark: '#553C9A',    // Violet foncé bouton
          light: '#9F7AEA',   // Violet clair hover
          bg: '#FFFBF0',      // Ton fond chaud
          card: '#FFFFFF',
          accent: '#FF6B35',  // Orange pour CTA Acheter
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'wenze': '12px',
      }
    },
  },
  plugins: [],
}
