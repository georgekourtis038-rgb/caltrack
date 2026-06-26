import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy, rarely-changing libs so app-code edits don't bust their cache.
          motion: ['framer-motion'],
          vendor: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'CalTrack',
        short_name: 'CalTrack',
        description: 'Gamified calorie tracking for two.',
        theme_color: '#0a0b0e',
        background_color: '#0a0b0e',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache only the local app shell/assets. No runtimeCaching, so
        // cross-origin API calls (Open Food Facts, Supabase, Anthropic) are
        // never intercepted by the service worker and go straight to the network.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // SPA navigation fallback should never shadow API/auth requests.
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
