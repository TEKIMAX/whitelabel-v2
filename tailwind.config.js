/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                serif: ['"Playfair Display"', 'serif'],
                sans: ['"Inter"', 'sans-serif'],
            },
            colors: {
                nobel: {
                    gold: 'rgb(var(--brand-color, 197 160 89) / <alpha-value>)',
                    dark: '#1a1a1a',
                    cream: '#F9F8F4',
                }
            }
        },
    },
    plugins: [],
}
