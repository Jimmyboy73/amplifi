/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#101628',
        // Refreshed Family Mission palette — azure = Core, sky = Family, amber = Boosters.
        // (Old values were azure #407bbf / sky #59c9e9 / amber #f59e0b.)
        sky: '#33c6ec',
        azure: '#2f6fc4',
        offwhite: '#f4f6f9',
        amber: '#f5a623',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        jakarta: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
