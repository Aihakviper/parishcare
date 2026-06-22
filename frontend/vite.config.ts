import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['steward-mark.svg'],
      manifest: {
        name: 'Steward',
        short_name: 'Steward',
        description: 'Verified artisans for RCCG Camp Smart City',
        theme_color: '#5B1A1A',
        background_color: '#F5F0E5',
        display: 'standalone',
        start_url: '/resident',
        icons: [
          {
            src: '/steward-mark.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
      },
    }),
  ],
})
