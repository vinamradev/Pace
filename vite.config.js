import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pace-icon-192x192.png', 'pace-icon-512x512.png'],
      manifest: {
        name: 'PACE - Personal Finance',
        short_name: 'PACE',
        description: 'Spend with intention. Save with purpose.',
        theme_color: '#09090c',
        background_color: '#09090c',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/pace-icon-192x192.png',
            sizes: '192x192 512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/pace-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          }
        ],
      },
  
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
