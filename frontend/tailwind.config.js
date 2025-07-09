// frontend/andon-dashboard/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
      "./public/index.html"
    ],
    theme: {
      extend: {
        colors: {
          'station-green': '#10B981',
          'station-red': '#EF4444',
          'station-yellow': '#F59E0B',
          'station-gray': '#6B7280',
          'fault-red': '#DC2626',
          'normal-green': '#059669',
          'warning-yellow': '#D97706',
          'inactive-gray': '#9CA3AF'
        },
        animation: {
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'bounce-slow': 'bounce 2s infinite',
          'fade-in': 'fadeIn 0.5s ease-in-out',
          'slide-up': 'slideUp 0.3s ease-out'
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' }
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' }
          }
        },
        fontFamily: {
          'mono': ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
        },
        spacing: {
          '18': '4.5rem',
          '88': '22rem',
          '128': '32rem'
        },
        screens: {
          '3xl': '1600px'
        }
      },
    },
    plugins: [],
    safelist: [
      'bg-station-green',
      'bg-station-red',
      'bg-station-yellow',
      'bg-station-gray',
      'text-white',
      'animate-pulse',
      'animate-bounce-slow'
    ]
  }