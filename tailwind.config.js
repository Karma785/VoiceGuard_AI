/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#060a0e',
          surface: '#0a1118',
          card: '#0e1620',
          border: '#1a2a3a',
          'border-bright': '#243a52',
          text: '#c8d4e0',
          'text-dim': '#6a7a8a',
          'text-bright': '#e0eaf2',
          green: '#00ff88',
          'green-dim': '#00cc6e',
          'green-glow': 'rgba(0, 255, 136, 0.4)',
          red: '#ff3355',
          'red-dim': '#cc2244',
          'red-glow': 'rgba(255, 51, 85, 0.4)',
          amber: '#ffaa00',
          'amber-glow': 'rgba(255, 170, 0, 0.4)',
          blue: '#00aaff',
          'blue-glow': 'rgba(0, 170, 255, 0.4)',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'flash-red': 'flash-red 0.5s ease-in-out infinite',
        'scan-line': 'scan-line 3s linear infinite',
        'wave-bar': 'wave-bar 0.8s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'flicker': 'flicker 3s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 8px 0 currentColor' },
          '50%': { opacity: '0.7', boxShadow: '0 0 16px 2px currentColor' },
        },
        'flash-red': {
          '0%, 100%': { opacity: '1', backgroundColor: 'rgba(255, 51, 85, 0.15)' },
          '50%': { opacity: '0.6', backgroundColor: 'rgba(255, 51, 85, 0.05)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'wave-bar': {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(40px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'ping-slow': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '48%': { opacity: '1' },
          '49%': { opacity: '0.3' },
          '50%': { opacity: '1' },
          '52%': { opacity: '0.5' },
          '53%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
