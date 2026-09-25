import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 // 10 MiB limit
      },
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Sistema de Incidencias APPB',
        short_name: 'APPB Tickets',
        description: 'Cliente móvil para gestión de incidencias',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
