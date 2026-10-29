/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#0B0F17',
        darkslate: '#111827',
        surface: '#1E293B',
        'surface-border': 'rgba(255, 255, 255, 0.08)',
        accent: {
          emerald: '#059669',
          'emerald-hover': '#10B981',
          amber: '#D97706',
          'amber-hover': '#F59E0B',
          rose: '#DC2626'
        },
        slate: {
          950: '#070B11',
          900: '#0B0F17',
          850: '#111827',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
          500: '#64748B',
          400: '#94A3B8',
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9',
          50: '#F8FAFC'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
