/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a5bdfc',
          400: '#819cf8',
          500: '#637bf2',
          600: '#4355e7',
          700: '#313ecc',
          800: '#1e293b',
          850: '#131e34',
          900: '#0f172a',
          950: '#070d1b',
        },
        brand: {
          teal: '#0d9488',
          'teal-light': '#14b8a6',
          'teal-dark': '#0f766e',
          cyan: '#06b6d4',
          emerald: '#10b981',
          slate: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'elevated': '0 10px 25px -5px rgb(0 0 0 / 0.06), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
        'glow-teal': '0 0 25px -5px rgba(13, 148, 136, 0.35)',
        'glow-sky': '0 0 25px -5px rgba(14, 165, 233, 0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
