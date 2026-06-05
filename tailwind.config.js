/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#020617',
          900: '#0f172a',
          850: '#1e293b',
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.25s ease-out forwards',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.6), inset 0 0 8px rgba(6, 182, 212, 0.3)',
            borderColor: 'rgb(6, 182, 212)',
          },
          '50%': {
            boxShadow: '0 0 4px rgba(6, 182, 212, 0.2), inset 0 0 2px rgba(6, 182, 212, 0.1)',
            borderColor: 'rgba(6, 182, 212, 0.4)',
          },
        },
        'fade-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(8px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  plugins: [],
}
