/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'grid': 'grid 20s linear infinite',
      },
      keyframes: {
        grid: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(calc(var(--cell-size) * 2))' },
        },
      },
      fontFamily: {
        'geist': ['Geist', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
