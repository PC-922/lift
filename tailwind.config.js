/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './*.tsx',
    './components/**/*.tsx',
  ],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'San Francisco', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        ios: {
          bg: 'var(--ios-bg)',
          card: 'var(--ios-card)',
          text: 'var(--ios-text)',
          blue: '#007AFF',
          gray: '#8E8E93',
          red: '#FF3B30',
          separator: 'var(--ios-separator)',
        },
      },
    },
  },
  plugins: [],
};

