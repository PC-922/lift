/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './*.tsx',
    './components/**/*.tsx',
    './hooks/**/*.tsx',
  ],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      colors: {
        app: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          'surface-muted': 'var(--color-surface-muted)',
          text: 'var(--color-text)',
          'text-muted': 'var(--color-text-muted)',
          border: 'var(--color-border)',
          accent: 'var(--color-accent)',
          'accent-foreground': 'var(--color-accent-foreground)',
          'accent-text': 'var(--color-accent-text)',
          'chip-bg': 'var(--color-chip-bg)',
          'chip-text': 'var(--color-chip-text)',
          danger: 'var(--color-danger)',
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
        },
      },
    },
  },
  plugins: [],
};
