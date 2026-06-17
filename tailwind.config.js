/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        glass: {
          white: 'rgba(255,255,255,0.12)',
          light: 'rgba(255,255,255,0.08)',
          border: 'rgba(255,255,255,0.18)',
          heavy: 'rgba(255,255,255,0.25)',
        },
        soil: {
          50: '#fdf6ee',
          100: '#f9e8d0',
          200: '#f2cfa0',
          300: '#e9ae66',
          400: '#df8d3b',
          500: '#d4721e',
          600: '#b85915',
          700: '#964215',
          800: '#7a3518',
          900: '#642d17',
        },
        earth: {
          green: '#4ade80',
          blue: '#38bdf8',
          amber: '#fbbf24',
          red: '#f87171',
          purple: '#a78bfa',
        }
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'system-ui', 'sans-serif'],
        display: ['SF Pro Display', 'Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
        '3xl': '64px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)',
        'slide-in': 'slideIn 0.4s cubic-bezier(0.16,1,0.3,1)',
        'fade-in': 'fadeIn 0.6s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'glow': 'glow 3s ease-in-out infinite',
        'rotate-slow': 'rotateSlow 20s linear infinite',
        'scan': 'scan 3s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: 0, transform: 'translateX(-20px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(74,222,128,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(74,222,128,0.6), 0 0 80px rgba(74,222,128,0.2)' },
        },
        rotateSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
        'glass-sm': '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
        'glass-lg': '0 16px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
        'glow-green': '0 0 30px rgba(74,222,128,0.4)',
        'glow-blue': '0 0 30px rgba(56,189,248,0.4)',
        'glow-amber': '0 0 30px rgba(251,191,36,0.4)',
      }
    },
  },
  plugins: [],
}
