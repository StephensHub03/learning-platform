/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#eef2f9',
          100: '#d6e0f0',
          200: '#b3c5e3',
          300: '#7fa0cd',
          400: '#5077b5',
          500: '#1e3a5f',  // primary navy
          600: '#193254',
          700: '#142848',
          800: '#0e1e38',
          900: '#09132a',
        },
        gold: {
          50:  '#fdf9ef',
          100: '#f9f0d4',
          200: '#f2deaa',
          300: '#e9c770',
          400: '#e0b048',
          500: '#c9a84c',  // primary gold
          600: '#b29040',
          700: '#8f7232',
          800: '#705826',
          900: '#574420',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
