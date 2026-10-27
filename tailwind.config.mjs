/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        kerala: {
          dark: '#064e3b',
          primary: '#047857',
          light: '#ecfdf5',
          gold: '#f59e0b',
          amber: '#d97706',
          ruby: '#dc2626'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        malayalam: ['"Manjari"', '"Noto Sans Malayalam"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
