import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'


export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      injectRegister: 'auto',

      includeAssets: [
        'pwa-192x192.png',
        'pwa-512x512.png',
        'apple-touch-icon.png',
        'push-sw.js'
      ],

      manifest: {
        name: 'رفقة البقرة',

        short_name: 'رفقة البقرة',

        description:
          'رفقة يومية للأذكار وقراءة سورة البقرة ومتابعة الإنجاز.',

        lang: 'ar',

        dir: 'rtl',

        start_url: '/',

        scope: '/',

        display: 'standalone',

        orientation: 'portrait-primary',

        background_color: '#ffffff',

        theme_color: '#174f3b',

        categories: [
          'lifestyle',
          'education'
        ],

        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },

          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },

      workbox: {
        cleanupOutdatedCaches: true,

        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,jpg,jpeg,json}'
        ],

        maximumFileSizeToCacheInBytes:
          5 * 1024 * 1024,

        navigateFallback:
          '/index.html',

        importScripts: [
          '/push-sw.js'
        ]
      },

      devOptions: {
        enabled: true
      }
    })
  ]
})