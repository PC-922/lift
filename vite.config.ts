import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['lift-32.png', 'lift-180.png', 'lift-192.png', 'lift-512.png'],
          manifest: {
            name: 'LIFT',
            short_name: 'LIFT',
            start_url: '/',
            display: 'standalone',
            background_color: '#000000',
            theme_color: '#000000',
            orientation: 'portrait',
            icons: [
              {
                src: '/lift-192.png',
                sizes: '192x192',
                type: 'image/png',
              },
              {
                src: '/lift-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable',
              },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,svg,woff2,png}'],
          },
        }),
      ],
      test: {
        environment: 'jsdom',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
