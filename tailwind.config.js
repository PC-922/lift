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
        sans: ['JetBrains Mono Variable', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        mono: ['JetBrains Mono Variable', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
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
          danger: 'var(--color-danger)',
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
        },
        ios: {
          bg: 'var(--color-bg)',
          card: 'var(--color-surface)',
          text: 'var(--color-text)',
          blue: 'var(--color-accent)',
          gray: 'var(--color-text-muted)',
          red: 'var(--color-danger)',
          separator: 'var(--color-border)',
        },
      },
    },
  },
  plugins: [],
};
