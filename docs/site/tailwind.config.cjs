/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          300: '#f5d98a',
          400: '#e8c35a',
          500: '#C5A065',
          600: '#b8933a',
          950: '#1a1200',
        },
      },
    },
  },
  plugins: [],
}
