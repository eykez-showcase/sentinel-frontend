/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0d1117',
          raised: '#161b22',
          border: '#30363d',
        },
        accent: {
          DEFAULT: '#58a6ff',
          dim: '#1f6feb',
        },
        alert: {
          low: '#3fb950',
          medium: '#d29922',
          high: '#f85149',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
