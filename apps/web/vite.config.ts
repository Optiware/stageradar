import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Un seul fichier `.env` à la racine du dépôt. Seules les variables VITE_* atteignent le front.
  envDir: '../..',
  server: {
    // Même routage que nginx en production (deploy/serveur/nginx.conf.modele), pour développer
    // contre la pile locale : VITE_SUPABASE_URL=http://localhost:5173 dans `.env`.
    proxy: {
      '/auth/v1': {
        target: 'http://127.0.0.1:54331',
        rewrite: (path) => path.replace(/^\/auth\/v1/, ''),
      },
      '/rest/v1': {
        target: 'http://127.0.0.1:54332',
        rewrite: (path) => path.replace(/^\/rest\/v1/, ''),
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg', 'robots.txt'],
      manifest: {
        name: 'StageRadar',
        short_name: 'StageRadar',
        description: "Offres d'alternance et de stages à l'étranger, et suivi de candidatures",
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
});
